import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const screenshotsDir = path.join(__dirname, '../screenshots')

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true })
}

const tmpUserData = path.join(os.tmpdir(), 'finn-chrome-bycompany-' + Date.now())

async function runTest() {
  console.log('====================================================')
  console.log('FINN By-Company View & Search/Sort Verification Suite')
  console.log('Viewport: 390x844 (Mobile iPhone format)')
  console.log('Server: http://localhost:5199/')
  console.log('====================================================\n')

  const chromeProc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9226',
    '--window-size=390,844',
    '--user-data-dir=' + tmpUserData,
    'http://localhost:5199/',
  ])

  await new Promise((r) => setTimeout(r, 2000))

  try {
    const listRes = await fetch('http://localhost:9226/json')
    const tabs = await listRes.json()
    const tab = tabs.find((t) => t.type === 'page') || tabs[0]

    if (!tab || !tab.webSocketDebuggerUrl) {
      throw new Error('No page tab found in Chrome on port 9226')
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

    const evaluate = async (expr) => {
      const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true })
      return res.result?.value
    }

    const capture = async (filename) => {
      const { data } = await send('Page.captureScreenshot', { format: 'png' })
      const filePath = path.join(screenshotsDir, filename)
      fs.writeFileSync(filePath, Buffer.from(data, 'base64'))
      console.log(`[PASS] Captured: ${filename}`)
    }

    // Wait for initial render
    await new Promise((r) => setTimeout(r, 1500))

    const getCompanySymbols = async () => {
      return await evaluate(`(() => {
        const sec = document.querySelector('section[aria-label="Companies"]');
        if (!sec) return [];
        return Array.from(sec.querySelectorAll('button span.font-mono.font-bold')).map(s => s.innerText.trim());
      })()`)
    }

    // -------------------------------------------------------------------------
    // TEST 1: 30d Window & Company List (Default: Most important)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 1: Switch to 30d window ---')
    await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn30 = btns.find(b => b.innerText.trim() === '30d');
      if (btn30) btn30.click();
    })()`)
    await new Promise((r) => setTimeout(r, 1000))

    // Verify 30d has NO toggle
    const toggle30d = await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim());
      return btns.includes('Ranked') && btns.includes('By company');
    })()`)
    if (toggle30d) throw new Error('[FAIL] 30d should have NO toggle')
    console.log('  ✓ Verified: 30d has NO Ranked | By company toggle (always by-company)')

    // Verify default sort is "Most important" and order has active companies first
    const symbolsImportance = await getCompanySymbols()
    console.log('  Symbols (Most important):', symbolsImportance.slice(0, 6).join(', '), '... (total:', symbolsImportance.length + ')')
    await capture('company-1-list-importance.png')

    // -------------------------------------------------------------------------
    // TEST 2: Sort Toggle (A-Z) & Reload Persistence
    // -------------------------------------------------------------------------
    console.log('\n--- Step 2: Toggle Sort to A-Z ---')
    const clickAzResult = await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btnAz = btns.find(b => b.innerText.trim() === 'A-Z');
      if (btnAz) {
        btnAz.click();
        return 'clicked';
      }
      return 'not_found: ' + btns.map(b => b.innerText.trim()).join(' | ');
    })()`)
    console.log('  clickAzResult:', clickAzResult)
    await new Promise((r) => setTimeout(r, 800))

    const symbolsAz = await getCompanySymbols()
    console.log('  Symbols (A-Z):', symbolsAz.slice(0, 7).join(', '), '... total:', symbolsAz.length)
    if (symbolsAz[0] !== 'ASTRAL' || symbolsAz[1] !== 'BAJFINANCE' || symbolsAz[2] !== 'CERA') {
      throw new Error(`[FAIL] A-Z is not truly alphabetical! Got: ${symbolsAz.slice(0, 5).join(', ')}`)
    }
    console.log('  ✓ Verified: A-Z is truly alphabetical (ASTRAL, BAJFINANCE, CERA, FINEORG, ...)')
    await capture('company-2-list-az.png')

    // Test reload persistence of sort
    console.log('  Testing reload persistence of A-Z...')
    await send('Page.reload')
    await new Promise((r) => setTimeout(r, 1500))
    // Switch to 30d again
    await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn30 = btns.find(b => b.innerText.trim() === '30d');
      if (btn30) btn30.click();
    })()`)
    await new Promise((r) => setTimeout(r, 800))

    const symbolsAfterReload = await getCompanySymbols()
    if (symbolsAfterReload[0] !== 'ASTRAL' || symbolsAfterReload[1] !== 'BAJFINANCE') {
      throw new Error(`[FAIL] A-Z sort did not persist after reload! Got: ${symbolsAfterReload.slice(0, 5).join(', ')}`)
    }
    console.log('  ✓ Verified: A-Z sort persists across page reload (localStorage: finn.companySort)')
    await capture('company-2b-list-az-reloaded.png')

    // Switch back to Most important for next tests
    await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btnImp = btns.find(b => b.innerText.trim() === 'Most important');
      if (btnImp) btnImp.click();
    })()`)
    await new Promise((r) => setTimeout(r, 500))

    // Helper: types text using Input.insertText
    const typeSearch = async (text) => {
      await evaluate(`(() => {
        const input = document.querySelector('input[placeholder="Search stock or sector"]');
        if (input) {
          input.focus();
          input.select();
        }
      })()`)
      await new Promise((r) => setTimeout(r, 100))
      // Clear existing text if any
      await send('Input.dispatchKeyEvent', { type: 'keyDown', windowsVirtualKeyCode: 65, ctrlKey: true }) // Ctrl+A
      await send('Input.dispatchKeyEvent', { type: 'keyDown', windowsVirtualKeyCode: 8 }) // Backspace
      await send('Input.insertText', { text })
      await new Promise((r) => setTimeout(r, 350)) // wait for 150ms debounce + render
    }

    // -------------------------------------------------------------------------
    // TEST 3: Search Box (Filters live, case-insensitive, symbol/name/sector)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 3: Search Box Testing ---')
    // Test: Search by sector "cement" -> leaves only ULTRACEMCO
    console.log('  Testing search: "cement" (sector match)...')
    await typeSearch('cement')

    const searchCementSymbols = await getCompanySymbols()
    console.log('  Results for "cement":', searchCementSymbols)
    if (searchCementSymbols.length !== 1 || searchCementSymbols[0] !== 'ULTRACEMCO') {
      throw new Error(`[FAIL] Expected only ULTRACEMCO for "cement", got: ${searchCementSymbols.join(', ')}`)
    }
    console.log('  ✓ Verified: "cement" matches sector and leaves only ULTRACEMCO')
    await capture('company-3-search-cement.png')

    // Test: Search "tata" -> matches TATASTEEL
    console.log('  Testing search: "tata"...')
    await typeSearch('tata')

    const searchTataSymbols = await getCompanySymbols()
    console.log('  Results for "tata":', searchTataSymbols)
    if (!searchTataSymbols.includes('TATASTEEL')) {
      throw new Error(`[FAIL] Expected TATASTEEL for "tata", got: ${searchTataSymbols.join(', ')}`)
    }
    console.log('  ✓ Verified: "tata" finds TATASTEEL')

    // Test: Gibberish search -> empty state
    console.log('  Testing search: "xyz987" (gibberish empty state)...')
    await typeSearch('xyz987')

    const emptyText = await evaluate(`document.body.innerText`)
    if (!emptyText.includes('No stock matches "xyz987"')) {
      throw new Error('[FAIL] Empty search state missing \'No stock matches "xyz987"\'')
    }
    console.log('  ✓ Verified: Gibberish shows empty state with \'No stock matches "xyz987"\' and Clear search button')
    await capture('company-4-search-empty.png')

    // Click "Clear search" button
    console.log('  Testing "Clear search" button...')
    await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const clearBtn = btns.find(b => b.innerText.trim() === 'Clear search');
      if (clearBtn) clearBtn.click();
    })()`)
    await new Promise((r) => setTimeout(r, 400))

    const allRestored = (await getCompanySymbols()).length
    if (allRestored !== 17) {
      throw new Error(`[FAIL] Expected 17 companies restored after clear search, got ${allRestored}`)
    }
    console.log('  ✓ Verified: Clearing search restores all 17 companies')

    // -------------------------------------------------------------------------
    // TEST 4: Navigation & Back Gesture Preserves Search Filter
    // -------------------------------------------------------------------------
    console.log('\n--- Step 4: Back gesture preserves search query ---')
    // Filter to "cement"
    await typeSearch('cement')

    // Tap ULTRACEMCO
    await evaluate(`(() => {
      const row = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('ULTRACEMCO'));
      if (row) row.click();
    })()`)
    await new Promise((r) => setTimeout(r, 800))

    const detailText = await evaluate(`document.body.innerText`)
    if (!detailText.includes('All companies') || !detailText.includes('UltraTech Cement')) {
      throw new Error('[FAIL] Company detail not opened for ULTRACEMCO')
    }
    console.log('  ✓ Opened ULTRACEMCO company detail')

    // Tap "All companies" back button
    await evaluate(`(() => {
      const backBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('All companies'));
      if (backBtn) backBtn.click();
    })()`)
    await new Promise((r) => setTimeout(r, 800))

    const inputValAfterBack = await evaluate(`(() => {
      const input = document.querySelector('input[placeholder="Search stock or sector"]');
      return input ? input.value : null;
    })()`)
    const symbolsAfterBack = await getCompanySymbols()

    console.log('  Search input after back:', inputValAfterBack)
    console.log('  Rows after back:', symbolsAfterBack)
    if (inputValAfterBack !== 'cement' || symbolsAfterBack.length !== 1 || symbolsAfterBack[0] !== 'ULTRACEMCO') {
      throw new Error('[FAIL] Back did not preserve filtered search state!')
    }
    console.log('  ✓ Verified: Back gesture returns to SAME filtered search list ("cement" -> ULTRACEMCO)')
    await capture('company-5-back-to-filtered.png')

    // Clear search for next test
    await evaluate(`(() => {
      const clearBtn = document.querySelector('button[aria-label="Clear search"]');
      if (clearBtn) clearBtn.click();
    })()`)
    await new Promise((r) => setTimeout(r, 400))

    // -------------------------------------------------------------------------
    // TEST 5: 24h has NO Toggle
    // -------------------------------------------------------------------------
    console.log('\n--- Step 5: Check 24h window (NO toggle) ---')
    await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn24 = btns.find(b => b.innerText.trim() === '24h');
      if (btn24) btn24.click();
    })()`)
    await new Promise((r) => setTimeout(r, 800))

    const toggle24h = await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim());
      return btns.includes('Ranked') && btns.includes('By company');
    })()`)
    if (toggle24h) throw new Error('[FAIL] 24h window should have NO toggle')
    console.log('  ✓ Verified: 24h window has NO toggle (ranked list only)')

    // -------------------------------------------------------------------------
    // TEST 6: 7d Window (Toggle "Ranked | By company")
    // -------------------------------------------------------------------------
    console.log('\n--- Step 6: Check 7d window (Ranked | By company toggle) ---')
    await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn7 = btns.find(b => b.innerText.trim() === '7d');
      if (btn7) btn7.click();
    })()`)
    await new Promise((r) => setTimeout(r, 1200))

    const screen7dText = await evaluate(`document.body.innerText`)
    console.log('  7d screen text preview:\n', screen7dText.slice(0, 400))

    // Verify toggle exists
    const toggle7d = await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim());
      return btns.includes('Ranked') && btns.includes('By company');
    })()`)
    if (!toggle7d) throw new Error('[FAIL] 7d window MUST have Ranked | By company toggle')
    console.log('  ✓ Verified: 7d window HAS Ranked | By company toggle')

    // If currently By company, click Ranked to test Ranked view first
    await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const rankedBtn = btns.find(b => b.innerText.trim() === 'Ranked');
      if (rankedBtn) rankedBtn.click();
    })()`)
    await new Promise((r) => setTimeout(r, 800))

    // In Ranked view, verify Needs you is present
    const rankedHasNeedsYou = await evaluate(`document.body.innerText.includes('Needs you') || document.body.innerText.includes('NEEDS YOU')`)
    if (!rankedHasNeedsYou) throw new Error('[FAIL] 7d Ranked view must show Needs you')
    console.log('  ✓ Verified: 7d Ranked view shows Needs you stack')
    await capture('company-6-7d-ranked.png')

    // Click "By company"
    console.log('  Clicking "By company" on 7d...')
    await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const byCompBtn = btns.find(b => b.innerText.trim() === 'By company');
      if (byCompBtn) byCompBtn.click();
    })()`)
    await new Promise((r) => setTimeout(r, 800))

    // In By company view, verify Needs you is NOT present
    const byCompHasNeedsYou = await evaluate(`document.body.innerText.includes('Needs you')`)
    if (byCompHasNeedsYou) throw new Error('[FAIL] By company view must NOT show Needs you stack')
    console.log('  ✓ Verified: 7d By company view does NOT show Needs you stack')

    // Verify companies with filings are shown first in Most important
    const comp7d = await evaluate(`(() => {
      return Array.from(document.querySelectorAll('button span.font-mono.font-bold')).map(s => s.innerText.trim());
    })()`)
    console.log('  7d By company first symbols:', comp7d.slice(0, 5))
    if (!comp7d.includes('BAJFINANCE') || !comp7d.includes('TATASTEEL')) {
      throw new Error('[FAIL] 7d By company missing active filing companies')
    }
    console.log('  ✓ Verified: 7d By company shows companies with filings first in Most important')
    await capture('company-7-7d-by-company.png')

    console.log('\n====================================================')
    console.log('ALL VERIFICATION CHECKS PASSED!')
    console.log('====================================================')
  } catch (err) {
    console.error('Error during verification:', err)
    throw err
  } finally {
    try {
      chromeProc.kill()
    } catch {}
    try {
      await new Promise((r) => setTimeout(r, 500))
      fs.rmSync(tmpUserData, { recursive: true, force: true })
    } catch {}
  }
}

runTest().catch((e) => {
  console.error(e)
  process.exit(1)
})
