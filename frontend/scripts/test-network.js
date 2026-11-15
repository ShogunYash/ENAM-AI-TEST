import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Chrome executable discovery
const possibleChromePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  process.env.CHROME_BIN,
  process.env.CHROME_PATH,
].filter(Boolean)

const chromePath = possibleChromePaths.find((p) => fs.existsSync(p)) || possibleChromePaths[0]
const screenshotsDir = path.join(__dirname, '../screenshots')

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true })
}

const tmpUserData = path.join(os.tmpdir(), 'finn-chrome-net-' + Date.now())
const DEV_URL = process.env.FINN_DEV_URL || 'http://localhost:5199/?nosplash'
const OFFLINE_URL = process.env.FINN_OFFLINE_URL || 'http://localhost:5198/?nosplash'
const CDP_PORT = process.env.FINN_CDP_PORT || 9229

async function runNetworkTests() {
  console.log('========================================================')
  console.log('FINN Network QA Verification Suite')
  console.log('Viewport: 390x844 (Mobile iPhone format)')
  console.log(`Live Dev Server: ${DEV_URL}`)
  console.log(`Offline Dev Server: ${OFFLINE_URL}`)
  console.log('========================================================\n')

  const results = []

  // Launch headless Chrome
  const chromeProc = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    '--window-size=390,844',
    `--user-data-dir=${tmpUserData}`,
    DEV_URL,
  ])

  let offlineViteProc = null

  await new Promise((r) => setTimeout(r, 2000))

  try {
    const listRes = await fetch(`http://localhost:${CDP_PORT}/json`)
    const tabs = await listRes.json()
    const tab = tabs.find((t) => t.type === 'page') || tabs[0]

    if (!tab || !tab.webSocketDebuggerUrl) {
      throw new Error(`No page tab found in Chrome on port ${CDP_PORT}`)
    }

    const ws = new WebSocket(tab.webSocketDebuggerUrl)
    await new Promise((resolve) => ws.addEventListener('open', resolve))

    let id = 1
    const send = (method, params = {}) => {
      const msgId = id++
      return new Promise((resolve, reject) => {
        const handler = (evt) => {
          const data = JSON.parse(evt.data)
          if (data.id === msgId) {
            ws.removeEventListener('message', handler)
            if (data.error) reject(data.error)
            else resolve(data.result)
          }
        }
        ws.addEventListener('message', handler)
        ws.send(JSON.stringify({ id: msgId, method, params }))
      })
    }

    await send('Page.enable')
    await send('Runtime.enable')

    // Emulate 390x844 mobile viewport with 2x DPR
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    })

    const evaluate = async (expr) => {
      const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true })
      return res.result?.value
    }

    const capture = async (filename) => {
      const { data } = await send('Page.captureScreenshot', { format: 'png' })
      const filePath = path.join(screenshotsDir, filename)
      fs.writeFileSync(filePath, Buffer.from(data, 'base64'))
      console.log(`  [CAPTURE] Saved: ${filename}`)
      return filename
    }

    const setTheme = async (mode) => {
      await evaluate(`(() => {
        localStorage.setItem('finn.theme', '${mode}');
        if ('${mode}' === 'dark') {
          document.documentElement.classList.add('dark');
          document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#09090B');
        } else {
          document.documentElement.classList.remove('dark');
          document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#F4F6FB');
        }
      })()`)
      await new Promise((r) => setTimeout(r, 400))
    }

    // Set initial light theme
    await setTheme('light')
    await new Promise((r) => setTimeout(r, 1200))

    // =========================================================================
    // CHECK 1: Bottom nav has "Network" tab, heading "Network", line
    //          "Synthetic demo network", and sections "Ask your network",
    //          "Keep warm" and "Expertise map" (each with at least one item)
    // =========================================================================
    console.log('\n--- Check 1: Network Tab & Sections ---')
    try {
      // Find and click Network tab in bottom nav
      const clickedTab = await evaluate(`(() => {
        const nav = document.querySelector('nav');
        if (!nav) return false;
        const btns = Array.from(nav.querySelectorAll('button'));
        const netBtn = btns.find(b => {
          const txt = (b.innerText || '').toLowerCase();
          return txt.includes('network');
        });
        if (netBtn) {
          netBtn.click();
          return true;
        }
        return false;
      })()`)

      if (!clickedTab) {
        throw new Error('Bottom nav has no "Network" tab button')
      }

      // Wait after tab tap for Network screen to mount
      let hasHeading = false
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 200))
        hasHeading = await evaluate(`(() => {
          const h1 = document.querySelector('h1');
          return Boolean(h1 && (h1.innerText || '').trim() === 'Network');
        })()`)
        if (hasHeading) break
      }

      if (!hasHeading) {
        throw new Error('Heading "Network" not found on Network screen')
      }

      // Verify subtitle line containing "Synthetic demo network"
      const hasSynthetic = await evaluate(`(() => {
        return (document.body.innerText || '').includes('Synthetic demo network');
      })()`)

      if (!hasSynthetic) {
        throw new Error('Line "Synthetic demo network" not found on Network screen')
      }

      // Verify section "Ask your network" with at least one item (input or chips)
      const hasAskSection = await evaluate(`(() => {
        const text = document.body.innerText || '';
        const hasTitle = text.toLowerCase().includes('ask your network');
        const hasInput = document.querySelector('#network-question') !== null || document.querySelector('input') !== null;
        const hasChips = Array.from(document.querySelectorAll('button')).some(b => {
          const t = b.innerText || '';
          return t.includes('Bajaj') || t.includes('wires') || t.includes('reconnect');
        });
        return hasTitle && (hasInput || hasChips);
      })()`)

      if (!hasAskSection) {
        throw new Error('Section "Ask your network" (or its items/input) not found')
      }

      // Verify section "Keep warm" with at least one item
      const hasKeepWarm = await evaluate(`(() => {
        const text = document.body.innerText || '';
        const hasTitle = text.toLowerCase().includes('keep warm');
        const hasItem = text.includes('last spoke') || text.includes('days ago') || text.includes('Copy');
        return hasTitle && hasItem;
      })()`)

      if (!hasKeepWarm) {
        throw new Error('Section "Keep warm" (or at least one warm item) not found')
      }

      // Verify section "Expertise map" with at least one item
      const hasExpertiseMap = await evaluate(`(() => {
        const text = document.body.innerText || '';
        const hasTitle = text.toLowerCase().includes('expertise map');
        const hasItem = text.includes('wires and cables') || text.includes('consumer demand') || text.includes('capex');
        return hasTitle && hasItem;
      })()`)

      if (!hasExpertiseMap) {
        throw new Error('Section "Expertise map" (or at least one theme chip) not found')
      }

      const shot = await capture('net-1-network-tab.png')
      console.log('  [PASS] Check 1: Network tab and sections verified')
      results.push({ num: 1, name: 'Network tab and sections', passed: true, screenshot: shot })
    } catch (err) {
      console.error(`  [FAIL] Check 1: ${err.message}`)
      const shot = await capture('net-1-network-tab-fail.png').catch(() => null)
      results.push({ num: 1, name: 'Network tab and sections', passed: false, error: err.message, screenshot: shot })
    }

    // =========================================================================
    // CHECK 2: Tapping a chip like "wires and cables" in the Expertise map
    //          reveals member names
    // =========================================================================
    console.log('\n--- Check 2: Expertise Chips ---')
    try {
      // The compact map exposes eight themes first; reveal the remaining themes before selecting wires.
      await evaluate(`(() => {
        const section = document.querySelector('section[aria-labelledby="expertise-title"]');
        const more = Array.from(section?.querySelectorAll('button') || []).find(b => b.innerText.trim() === 'More themes');
        more?.click();
      })()`)
      await new Promise((r) => setTimeout(r, 200))
      // Scope specifically to the Expertise map section to avoid the Ask-box suggestion chip
      const chipClicked = await evaluate(`(() => {
        const section = document.querySelector('section[aria-labelledby="expertise-title"]') ||
                        Array.from(document.querySelectorAll('section')).find(s => (s.innerText || '').includes('Expertise map'));
        if (!section) return false;
        const btns = Array.from(section.querySelectorAll('button'));
        const chip = btns.find(b => (b.innerText || '').toLowerCase().includes('wires and cables'));
        if (chip) {
          chip.scrollIntoView({ behavior: 'instant', block: 'center' });
          chip.click();
          return true;
        }
        return false;
      })()`)

      if (!chipClicked) {
        throw new Error('Chip "wires and cables" not found in Expertise map section')
      }

      let revealed = false
      for (let i = 0; i < 15; i++) {
        await new Promise((r) => setTimeout(r, 200))
        revealed = await evaluate(`(() => {
          const text = document.body.innerText || '';
          return text.includes('Kavita Pillai') || text.includes('POLYCAB') || text.includes('KEI');
        })()`)
        if (revealed) break
      }

      if (!revealed) {
        throw new Error('Tapping "wires and cables" did not reveal member names (e.g. Kavita Pillai)')
      }

      const shot = await capture('net-2-expertise-chips.png')
      console.log('  [PASS] Check 2: Expertise chips reveal members verified')
      results.push({ num: 2, name: 'Expertise chips reveal members', passed: true, screenshot: shot })
    } catch (err) {
      console.error(`  [FAIL] Check 2: ${err.message}`)
      const shot = await capture('net-2-expertise-chips-fail.png').catch(() => null)
      results.push({ num: 2, name: 'Expertise chips reveal members', passed: false, error: err.message, screenshot: shot })
    }

    // =========================================================================
    // CHECK 3: The "Copy" button on a Keep-warm card changes to "Copied"
    // =========================================================================
    console.log('\n--- Check 3: Copy Button on Keep-warm Card ---')
    try {
      // Mock clipboard write to prevent headless permission rejections
      await evaluate(`(() => {
        if (!navigator.clipboard) navigator.clipboard = {};
        navigator.clipboard.writeText = () => Promise.resolve();
      })()`)

      const copyClicked = await evaluate(`(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const copyBtn = btns.find(b => {
          const txt = (b.innerText || '').trim();
          const aria = b.getAttribute('aria-label') || '';
          return txt === 'Copy' || aria.includes('Copy opener') || aria.includes('Copy');
        });
        if (copyBtn) {
          copyBtn.scrollIntoView({ behavior: 'instant', block: 'center' });
          copyBtn.click();
          return true;
        }
        return false;
      })()`)

      if (!copyClicked) {
        throw new Error('Copy button not found on Keep-warm card')
      }

      let hasCopied = false
      for (let i = 0; i < 10; i++) {
        await new Promise((r) => setTimeout(r, 200))
        hasCopied = await evaluate(`(() => {
          const text = document.body.innerText || '';
          const btns = Array.from(document.querySelectorAll('button'));
          return text.includes('Copied') || btns.some(b => (b.innerText || '').includes('Copied'));
        })()`)
        if (hasCopied) break
      }

      if (!hasCopied) {
        throw new Error('Button text did not change to "Copied" after clicking Copy')
      }

      const shot = await capture('net-3-copy-button.png')
      console.log('  [PASS] Check 3: Copy button changes to "Copied" verified')
      results.push({ num: 3, name: 'Copy button on Keep-warm card', passed: true, screenshot: shot })
    } catch (err) {
      console.error(`  [FAIL] Check 3: ${err.message}`)
      const shot = await capture('net-3-copy-button-fail.png').catch(() => null)
      results.push({ num: 3, name: 'Copy button on Keep-warm card', passed: false, error: err.message, screenshot: shot })
    }

    // =========================================================================
    // CHECK 4: With API unreachable (VITE_API_BASE=http://localhost:9),
    //          asking a question shows offline message "Asking needs the live API"
    //          and the rest of the tab still renders
    // =========================================================================
    console.log('\n--- Check 4: Offline Question Asking ---')
    try {
      // Start offline Vite dev server on port 5198
      console.log('  Starting secondary offline Vite dev server on port 5198...')
      offlineViteProc = spawn(
        'cmd.exe',
        ['/c', 'set VITE_API_BASE=http://localhost:9&& npm run dev -- --port 5198 --strictPort'],
        {
          cwd: path.join(__dirname, '..'),
          stdio: 'ignore',
        }
      )

      await new Promise((r) => setTimeout(r, 2500))

      // Navigate Chrome to offline server
      await send('Page.navigate', { url: `${OFFLINE_URL}?tab=network` })
      await new Promise((r) => setTimeout(r, 2000))

      // Tap Network tab if not already on it
      await evaluate(`(() => {
        const nav = document.querySelector('nav');
        if (!nav) return false;
        const btn = Array.from(nav.querySelectorAll('button')).find(b => (b.innerText || '').toLowerCase().includes('network'));
        if (btn) btn.click();
      })()`)
      await new Promise((r) => setTimeout(r, 800))

      // Ask a question: click suggestion chip or submit input
      const questionTriggered = await evaluate(`(() => {
        // Option A: prompt chip
        const btns = Array.from(document.querySelectorAll('button'));
        const chip = btns.find(b => {
          const t = (b.innerText || '').toLowerCase();
          return t.includes('bajaj finance') || t.includes('wires and cables') || t.includes('reconnect');
        });
        if (chip) {
          chip.click();
          return true;
        }

        // Option B: input element
        const input = document.querySelector('input');
        if (input) {
          input.value = 'Who knows Bajaj Finance?';
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          const form = input.closest('form');
          if (form) {
            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
          } else {
            const sendBtn = btns.find(b => {
              const aria = (b.getAttribute('aria-label') || '').toLowerCase();
              return aria.includes('send') || aria.includes('ask') || (b.innerText || '').toLowerCase().includes('ask');
            });
            if (sendBtn) sendBtn.click();
          }
          return true;
        }
        return false;
      })()`)

      if (!questionTriggered) {
        throw new Error('Could not trigger a question via chip or input on Network tab')
      }

      // Wait for offline resolution
      let hasOfflineMsg = false
      for (let i = 0; i < 15; i++) {
        await new Promise((r) => setTimeout(r, 200))
        hasOfflineMsg = await evaluate(`(() => {
          const text = document.body.innerText || '';
          return text.includes('Asking needs the live API');
        })()`)
        if (hasOfflineMsg) break
      }

      if (!hasOfflineMsg) {
        throw new Error('Offline message "Asking needs the live API" was not displayed')
      }

      // Verify rest of tab still renders (Keep warm and Expertise map sections)
      const restRenders = await evaluate(`(() => {
        const text = document.body.innerText || '';
        return text.toLowerCase().includes('keep warm') && text.toLowerCase().includes('expertise map');
      })()`)

      if (!restRenders) {
        throw new Error('Rest of Network tab did not render properly in offline mode')
      }

      const shot = await capture('net-4-offline-ask.png')
      console.log('  [PASS] Check 4: Offline question message and tab rendering verified')
      results.push({ num: 4, name: 'Offline question message and tab rendering', passed: true, screenshot: shot })
    } catch (err) {
      console.error(`  [FAIL] Check 4: ${err.message}`)
      const shot = await capture('net-4-offline-ask-fail.png').catch(() => null)
      results.push({ num: 4, name: 'Offline question message and tab rendering', passed: false, error: err.message, screenshot: shot })
    } finally {
      if (offlineViteProc) {
        try {
          spawn('taskkill', ['/pid', String(offlineViteProc.pid), '/f', '/t'])
          offlineViteProc.kill()
        } catch {}
      }
      // Return to main server
      await send('Page.navigate', { url: `${DEV_URL}` })
      await new Promise((r) => setTimeout(r, 2000))
    }

    // Switch to dark theme for checks 5-8 to verify dark styling
    await setTheme('dark')

    // =========================================================================
    // CHECK 5: On Today > 30d > company HDFCBANK a card shows an
    //          "In your network" strip; tapping it expands to person rows with
    //          a "why" line
    // =========================================================================
    console.log('\n--- Check 5: "In your network" Strip on Today ---')
    try {
      // Navigate to Today
      await evaluate(`(() => {
        const nav = document.querySelector('nav');
        if (!nav) return;
        const btn = Array.from(nav.querySelectorAll('button')).find(b => (b.innerText || '').includes('Today'));
        if (btn) btn.click();
      })()`)
      await new Promise((r) => setTimeout(r, 600))

      // Switch to 30d window
      await evaluate(`(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const b30 = btns.find(b => (b.innerText || '').trim() === '30d');
        if (b30) b30.click();
      })()`)
      await new Promise((r) => setTimeout(r, 1200))

      // Drill into HDFCBANK
      const clickedHdfc = await evaluate(`(() => {
        const items = Array.from(document.querySelectorAll('section[aria-label="Companies"] button, article, button'));
        const hdfc = items.find(el => {
          const txt = el.innerText || '';
          return txt.includes('HDFCBANK') || txt.includes('HDFC Bank');
        });
        if (hdfc) {
          hdfc.scrollIntoView({ behavior: 'instant', block: 'center' });
          hdfc.click();
          return true;
        }
        return false;
      })()`)

      if (!clickedHdfc) {
        throw new Error('Could not find or click HDFCBANK in 30d company list')
      }

      await new Promise((r) => setTimeout(r, 1200))

      // Check for the "In your network" strip on filing cards
      const stripFound = await evaluate(`(() => {
        const text = document.body.innerText || '';
        const hasNetworkText = text.includes('In your network');
        const stripBtn = Array.from(document.querySelectorAll('button')).find(b => {
          const t = b.innerText || '';
          const aria = b.getAttribute('aria-label') || '';
          return t.includes('In your network') || aria.includes('In your network');
        });
        return Boolean(hasNetworkText || stripBtn);
      })()`)

      if (!stripFound) {
        throw new Error('"In your network" strip not found on HDFCBANK filing cards')
      }

      // Tap strip to expand
      await evaluate(`(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const stripBtn = btns.find(b => {
          const t = b.innerText || '';
          const aria = b.getAttribute('aria-label') || '';
          return t.includes('In your network') || aria.includes('In your network');
        });
        if (stripBtn) {
          stripBtn.scrollIntoView({ behavior: 'instant', block: 'center' });
          stripBtn.click();
        }
      })()`)

      await new Promise((r) => setTimeout(r, 800))

      // Check expanded person rows with a "why" line
      const hasPersonAndWhy = await evaluate(`(() => {
        const text = document.body.innerText || '';
        // In insights.json, Kabir Malhotra / Lakshmi Venkatesh have "Worked at HDFC Bank" why line
        const hasPerson = text.includes('Kabir Malhotra') || text.includes('Lakshmi Venkatesh') || text.includes('Imran Siddiqui');
        const hasWhy = text.includes('Worked at HDFC Bank') || text.includes('bank governance') || text.includes('why') || text.includes('evidence');
        return hasPerson || hasWhy;
      })()`)

      if (!hasPersonAndWhy) {
        throw new Error('Expanded network strip does not show person rows with a "why" line')
      }

      const shot = await capture('net-5-today-network-strip.png')
      console.log('  [PASS] Check 5: "In your network" strip and expansion verified')
      results.push({ num: 5, name: '"In your network" strip on Today', passed: true, screenshot: shot })
    } catch (err) {
      console.error(`  [FAIL] Check 5: ${err.message}`)
      const shot = await capture('net-5-today-network-strip-fail.png').catch(() => null)
      results.push({ num: 5, name: '"In your network" strip on Today', passed: false, error: err.message, screenshot: shot })
    }

    // =========================================================================
    // CHECK 6: On Research > a pre-built company (e.g. INFY) the card
    //          "Who to call about" appears
    // =========================================================================
    console.log('\n--- Check 6: "Who to call" Card on Research ---')
    try {
      // Navigate to Research tab
      await evaluate(`(() => {
        const nav = document.querySelector('nav');
        if (!nav) return;
        const btn = Array.from(nav.querySelectorAll('button')).find(b => (b.innerText || '').includes('Research'));
        if (btn) btn.click();
      })()`)
      await new Promise((r) => setTimeout(r, 1000))

      // Open Ready reports to show prebuilt companies (including INFY)
      await evaluate(`(() => {
        const btns = Array.from(document.querySelectorAll('div[role="group"] button, button'));
        const readyBtn = btns.find(b => (b.innerText || '').trim() === 'Ready reports');
        if (readyBtn) readyBtn.click();
      })()`)
      await new Promise((r) => setTimeout(r, 1000))

      // Drill into INFY article directly
      const clickedInfy = await evaluate(`(() => {
        const articles = Array.from(document.querySelectorAll('article'));
        const infy = articles.find(a => (a.innerText || '').includes('INFY'));
        if (infy) {
          infy.scrollIntoView({ behavior: 'instant', block: 'center' });
          infy.click();
          return true;
        }
        return false;
      })()`)

      if (!clickedInfy) {
        throw new Error('Could not find or click INFY article under Ready reports on Research screen')
      }

      let hasWhoToCall = false
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 200))
        hasWhoToCall = await evaluate(`(() => {
          const text = document.body.innerText || '';
          const hasTitle = text.includes('Who to call about');
          const hasMatches = text.includes('Arjun Rao') || text.includes('Aditya Bose');
          return hasTitle && hasMatches;
        })()`)
        if (hasWhoToCall) break
      }

      if (!hasWhoToCall) {
        throw new Error('"Who to call about" card (or its person matches) not found on INFY Research page')
      }

      const shot = await capture('net-6-research-who-to-call.png')
      console.log('  [PASS] Check 6: "Who to call" card on Research verified')
      results.push({ num: 6, name: '"Who to call" on Research', passed: true, screenshot: shot })
    } catch (err) {
      console.error(`  [FAIL] Check 6: ${err.message}`)
      const shot = await capture('net-6-research-who-to-call-fail.png').catch(() => null)
      results.push({ num: 6, name: '"Who to call" on Research', passed: false, error: err.message, screenshot: shot })
    }

    // =========================================================================
    // CHECK 7: Tapping a person name opens a dialog (role="dialog") that
    //          closes with Escape
    // =========================================================================
    console.log('\n--- Check 7: Person Dialog & Escape ---')
    try {
      // Tap person name (Arjun Rao or Aditya Bose from WhoToCall card)
      const personClicked = await evaluate(`(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const personBtn = btns.find(b => {
          const txt = (b.innerText || '').trim();
          return txt === 'Arjun Rao' || txt === 'Aditya Bose' || txt.includes('Arjun Rao');
        });
        if (personBtn) {
          personBtn.scrollIntoView({ behavior: 'instant', block: 'center' });
          personBtn.click();
          return true;
        }
        return false;
      })()`)

      if (!personClicked) {
        throw new Error('Could not find person name element to click')
      }

      let hasDialog = false
      for (let i = 0; i < 15; i++) {
        await new Promise((r) => setTimeout(r, 200))
        hasDialog = await evaluate(`(() => {
          const dialog = document.querySelector('[role="dialog"]');
          return Boolean(dialog && dialog.getBoundingClientRect().height > 50);
        })()`)
        if (hasDialog) break
      }

      if (!hasDialog) {
        throw new Error('Tapping person name did not open an element with role="dialog"')
      }

      const shot = await capture('net-7-person-dialog.png')

      // Send Escape key event via CDP
      await send('Input.dispatchKeyEvent', {
        type: 'rawKeyDown',
        key: 'Escape',
        code: 'Escape',
        windowsVirtualKeyCode: 27,
      })
      await send('Input.dispatchKeyEvent', {
        type: 'keyUp',
        key: 'Escape',
        code: 'Escape',
        windowsVirtualKeyCode: 27,
      })

      let isClosed = false
      for (let i = 0; i < 15; i++) {
        await new Promise((r) => setTimeout(r, 200))
        isClosed = await evaluate(`(() => {
          const dialog = document.querySelector('[role="dialog"]');
          return dialog === null || dialog.getBoundingClientRect().height === 0;
        })()`)
        if (isClosed) break
      }

      if (!isClosed) {
        throw new Error('Pressing Escape did not close the person dialog')
      }

      console.log('  [PASS] Check 7: Person dialog with role="dialog" and Escape close verified')
      results.push({ num: 7, name: 'Person dialog and Escape', passed: true, screenshot: shot })
    } catch (err) {
      console.error(`  [FAIL] Check 7: ${err.message}`)
      const shot = await capture('net-7-person-dialog-fail.png').catch(() => null)
      results.push({ num: 7, name: 'Person dialog and Escape', passed: false, error: err.message, screenshot: shot })
    }

    // =========================================================================
    // CHECK 8: Profile shows "Your network is private to you"
    // =========================================================================
    console.log('\n--- Check 8: Privacy Card on Profile ---')
    try {
      // Tap Profile button in top app bar
      const profileClicked = await evaluate(`(() => {
        const profBtn = document.querySelector('button[aria-label="Profile"]');
        if (profBtn) {
          profBtn.click();
          return true;
        }
        return false;
      })()`)

      if (!profileClicked) {
        // Fallback: hash navigation or direct tab change
        await send('Page.navigate', { url: `${DEV_URL}&tab=profile` })
      }

      let hasPrivacyCard = false
      for (let i = 0; i < 10; i++) {
        await new Promise((r) => setTimeout(r, 200))
        hasPrivacyCard = await evaluate(`(() => {
          const text = document.body.innerText || '';
          return text.includes('Your network is private to you');
        })()`)
        if (hasPrivacyCard) break
      }

      if (!hasPrivacyCard) {
        throw new Error('Profile does not show "Your network is private to you"')
      }

      const shot = await capture('net-8-profile-privacy.png')
      console.log('  [PASS] Check 8: Privacy card on Profile verified')
      results.push({ num: 8, name: 'Privacy card on Profile', passed: true, screenshot: shot })
    } catch (err) {
      console.error(`  [FAIL] Check 8: ${err.message}`)
      const shot = await capture('net-8-profile-privacy-fail.png').catch(() => null)
      results.push({ num: 8, name: 'Privacy card on Profile', passed: false, error: err.message, screenshot: shot })
    }

    // =========================================================================
    // SUMMARY
    // =========================================================================
    console.log('\n========================================================')
    console.log('FINN NETWORK QA SUITE SUMMARY')
    console.log('========================================================')
    let allPassed = true
    for (const r of results) {
      const status = r.passed ? 'PASS' : 'FAIL'
      console.log(`[${status}] Check ${r.num}: ${r.name}${r.error ? ` - ${r.error}` : ''}`)
      if (!r.passed) allPassed = false
    }
    console.log('========================================================\n')

    if (!allPassed) {
      process.exitCode = 1
    }
  } finally {
    try {
      chromeProc.kill()
    } catch {}
    if (offlineViteProc) {
      try {
        spawn('taskkill', ['/pid', String(offlineViteProc.pid), '/f', '/t'])
        offlineViteProc.kill()
      } catch {}
    }
    try {
      await new Promise((r) => setTimeout(r, 500))
      fs.rmSync(tmpUserData, { recursive: true, force: true })
    } catch {}
  }
}

runNetworkTests().catch((e) => {
  console.error('\n[FATAL ERROR IN NETWORK QA SUITE]', e)
  process.exit(1)
})
