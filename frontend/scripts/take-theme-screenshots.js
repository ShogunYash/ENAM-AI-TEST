import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const screenshotsDir = path.join(__dirname, '../screenshots')
const brainDir = 'C:\\Users\\shind\\.gemini\\antigravity\\brain\\6b5773e6-4806-4a7a-a6a6-b18a9519bf75'

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true })
}

const tmpUserData = path.join(os.tmpdir(), 'finn-chrome-theme-' + Date.now())

async function runScreenshotSuite() {
  console.log('========================================================')
  console.log('FINN Theme Screenshot Capture (Light + Dark, 390x844)')
  console.log('Dev Server: http://localhost:5199/')
  console.log('========================================================\n')

  const chromeProc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9232',
    '--window-size=390,844',
    '--user-data-dir=' + tmpUserData,
    'http://localhost:5199/',
  ])

  await new Promise((r) => setTimeout(r, 2000))

  try {
    const listRes = await fetch('http://localhost:9232/json')
    const tabs = await listRes.json()
    const tab = tabs.find((t) => t.type === 'page') || tabs[0]

    if (!tab || !tab.webSocketDebuggerUrl) {
      throw new Error('No page tab found in Chrome on port 9232')
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
      const buf = Buffer.from(data, 'base64')
      
      const localPath = path.join(screenshotsDir, filename)
      fs.writeFileSync(localPath, buf)

      if (fs.existsSync(brainDir)) {
        const brainPath = path.join(brainDir, filename)
        fs.writeFileSync(brainPath, buf)
      }
      console.log(`[SAVED] ${filename}`)
    }

    const themes = ['light', 'dark']

    for (const theme of themes) {
      console.log(`\n================== THEME: ${theme.toUpperCase()} ==================`)

      // Set theme via script and localStorage
      await evaluate(`(() => {
        localStorage.setItem('finn.theme', '${theme}');
        if ('${theme}' === 'dark') {
          document.documentElement.classList.add('dark');
          document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#0E1424');
        } else {
          document.documentElement.classList.remove('dark');
          document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#F4F6FB');
        }
      })()`)
      await new Promise((r) => setTimeout(r, 600))

      // 1. Today (24h Priority feed)
      console.log('Capturing: Today 24h Priority feed...')
      await evaluate(`(() => {
        const navBtns = Array.from(document.querySelectorAll('nav button'));
        const todayNav = navBtns.find(b => b.innerText.includes('Today'));
        if (todayNav) todayNav.click();

        const scopeBtns = Array.from(document.querySelectorAll('div[aria-label="Universe scope"] button'));
        const portBtn = scopeBtns.find(b => b.innerText.includes('portfolio'));
        if (portBtn) portBtn.click();

        const winBtns = Array.from(document.querySelectorAll('button'));
        const b24 = winBtns.find(b => b.innerText.trim() === '24h');
        if (b24) b24.click();

        window.scrollTo(0, 0);
      })()`)
      await new Promise((r) => setTimeout(r, 1200))
      await capture(`theme-${theme}-1-today-24h-priority.png`)

      // 2. Today 30d by company
      console.log('Capturing: Today 30d by company...')
      await evaluate(`(() => {
        const winBtns = Array.from(document.querySelectorAll('button'));
        const b30d = winBtns.find(b => b.innerText.trim() === '30d');
        if (b30d) b30d.click();
        window.scrollTo(0, 0);
      })()`)
      await new Promise((r) => setTimeout(r, 1200))
      await capture(`theme-${theme}-2-today-30d-companies.png`)

      // Drill into BAJFINANCE from 30d list
      console.log('Drilling into BAJFINANCE detail...')
      await evaluate(`(() => {
        const sec = document.querySelector('section[aria-label="Companies"]');
        if (sec) {
          const rows = Array.from(sec.querySelectorAll('button'));
          const baj = rows.find(b => b.innerText.includes('BAJFINANCE'));
          if (baj) baj.click();
        }
      })()`)
      await new Promise((r) => setTimeout(r, 1200))

      // 3. Results card (in BAJFINANCE detail)
      console.log('Capturing: Results card...')
      await evaluate(`(() => {
        const articles = Array.from(document.querySelectorAll('article'));
        const res = articles.find(a => a.innerText.includes('Q2 FY27') && a.innerText.includes('Revenue'));
        if (res) res.scrollIntoView({ behavior: 'instant', block: 'center' });
      })()`)
      await new Promise((r) => setTimeout(r, 600))
      await capture(`theme-${theme}-3-results-card.png`)

      // 4. Management card (in BAJFINANCE detail)
      console.log('Capturing: Management card...')
      await evaluate(`(() => {
        const articles = Array.from(document.querySelectorAll('article'));
        const mgmt = articles.find(a => a.innerText.includes('management change') || a.innerText.includes('Prashant Verma'));
        if (mgmt) mgmt.scrollIntoView({ behavior: 'instant', block: 'center' });
      })()`)
      await new Promise((r) => setTimeout(r, 600))
      await capture(`theme-${theme}-4-management-card.png`)

      // 10. Ask sheet (from BAJFINANCE card)
      console.log('Capturing: Ask sheet...')
      const openedAsk = await evaluate(`(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const ask = btns.find(b => b.innerText && b.innerText.includes('Ask FINN'));
        if (ask) {
          ask.click();
          return true;
        }
        return false;
      })()`)
      console.log('  Ask button clicked:', openedAsk)
      await new Promise((r) => setTimeout(r, 1000))

      // Tap first suggested question chip
      await evaluate(`(() => {
        const chips = Array.from(document.querySelectorAll('button.rounded-full'));
        if (chips.length > 0) chips[0].click();
      })()`)
      // Wait for response to load from backend
      for (let i = 0; i < 15; i++) {
        const hasAnswer = await evaluate(`(() => {
          return document.querySelector('div.bg-zinc-800\\/50') !== null || document.querySelector('p.text-xs') !== null;
        })()`)
        if (hasAnswer) break
        await new Promise((r) => setTimeout(r, 300))
      }
      await new Promise((r) => setTimeout(r, 800))
      await capture(`theme-${theme}-10-ask-sheet.png`)

      // Close Ask sheet
      await evaluate(`(() => {
        const close = document.querySelector('button[aria-label="Close Ask FINN"]');
        if (close) close.click();
      })()`)
      await new Promise((r) => setTimeout(r, 600))

      // Back to Today list
      await evaluate(`(() => {
        const backBtn = document.querySelector('button[aria-label="Back to all companies"]') ||
                        document.querySelector('button[aria-label="Back to companies"]') ||
                        Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('All companies') || b.querySelector('svg.lucide-arrow-left'));
        if (backBtn) backBtn.click();
        else window.history.back();
      })()`)
      await new Promise((r) => setTimeout(r, 600))

      // 11. Help sheet
      console.log('Capturing: Help sheet...')
      await evaluate(`(() => {
        const helpBtn = document.querySelector('button[aria-label="How to read this digest"]') ||
                        Array.from(document.querySelectorAll('button')).find(b => b.getAttribute('aria-label')?.includes('How to read'));
        if (helpBtn) helpBtn.click();
      })()`)
      await new Promise((r) => setTimeout(r, 1000))
      await capture(`theme-${theme}-11-help-sheet.png`)

      // Close Help sheet
      await evaluate(`(() => {
        const close = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'Got it' || b.getAttribute('aria-label')?.includes('Close'));
        if (close) close.click();
      })()`)
      await new Promise((r) => setTimeout(r, 600))

      // 5. Research list
      console.log('Capturing: Research list...')
      await evaluate(`(() => {
        const navBtns = Array.from(document.querySelectorAll('nav button'));
        const resNav = navBtns.find(b => b.innerText.includes('Research'));
        if (resNav) resNav.click();
        window.scrollTo(0, 0);
      })()`)
      await new Promise((r) => setTimeout(r, 1200))
      await capture(`theme-${theme}-5-research-list.png`)

      // 6. INFY report
      console.log('Capturing: INFY report...')
      await evaluate(`(() => {
        const articles = Array.from(document.querySelectorAll('article'));
        const infy = articles.find(a => a.innerText.includes('INFY'));
        if (infy) infy.click();
      })()`)
      await new Promise((r) => setTimeout(r, 1500))
      // Scroll to show guidance verdict & range shift
      await evaluate(`(() => {
        window.scrollBy(0, 240);
      })()`)
      await new Promise((r) => setTimeout(r, 600))
      await capture(`theme-${theme}-6-research-infy.png`)

      // Back to research list before leaving
      await evaluate(`(() => {
        const backBtn = document.querySelector('button[aria-label="Back to research list"]') ||
                        Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Back') || b.querySelector('svg.lucide-arrow-left'));
        if (backBtn) backBtn.click();
        else window.history.back();
      })()`)
      await new Promise((r) => setTimeout(r, 600))

      // 7. Thresholds (collapsed)
      console.log('Capturing: Thresholds (collapsed)...')
      await evaluate(`(() => {
        const navBtns = Array.from(document.querySelectorAll('nav button'));
        const threshNav = navBtns.find(b => b.innerText.includes('Thresholds'));
        if (threshNav) threshNav.click();
        window.scrollTo(0, 0);
      })()`)
      await new Promise((r) => setTimeout(r, 1000))
      await capture(`theme-${theme}-7-thresholds-collapsed.png`)

      // 8. Thresholds (Filing types open)
      console.log('Capturing: Thresholds (Filing types open)...')
      await evaluate(`(() => {
        const catHdr = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Filing types'));
        if (catHdr) catHdr.click();
      })()`)
      await new Promise((r) => setTimeout(r, 800))
      // Scroll to show category items
      await evaluate(`(() => {
        window.scrollBy(0, 240);
      })()`)
      await new Promise((r) => setTimeout(r, 500))
      await capture(`theme-${theme}-8-thresholds-categories.png`)

      // 9. Cost / Stats
      console.log('Capturing: Cost screen...')
      await evaluate(`(() => {
        const navBtns = Array.from(document.querySelectorAll('nav button'));
        const costNav = navBtns.find(b => b.innerText.includes('Cost'));
        if (costNav) costNav.click();
        window.scrollTo(0, 0);
      })()`)
      await new Promise((r) => setTimeout(r, 1000))
      await capture(`theme-${theme}-9-cost.png`)
    }

    console.log('\n========================================================')
    console.log('ALL SCREENSHOTS CAPTURED SUCCESSFULLY!')
    console.log('========================================================')

    ws.close()
    chromeProc.kill()
    process.exit(0)
  } catch (err) {
    console.error('\n[SCREENSHOT SUITE FAILED]', err)
    try {
      chromeProc.kill()
    } catch {}
    process.exit(1)
  }
}

runScreenshotSuite()
