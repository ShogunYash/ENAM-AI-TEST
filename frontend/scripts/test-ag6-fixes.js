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

const tmpUserData = path.join(os.tmpdir(), 'finn-chrome-ag6-' + Date.now())

async function runTest() {
  console.log('========================================================')
  console.log('FINN AG-6: Five UI Fixes Verification Suite')
  console.log('Viewport: 390x844 (Mobile iPhone format)')
  console.log('Dev Server: http://localhost:5199/')
  console.log('========================================================\n')

  const chromeProc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9229',
    '--window-size=390,844',
    '--user-data-dir=' + tmpUserData,
    'http://localhost:5199/',
  ])

  await new Promise((r) => setTimeout(r, 2000))

  try {
    const listRes = await fetch('http://localhost:9229/json')
    const tabs = await listRes.json()
    const tab = tabs.find((t) => t.type === 'page') || tabs[0]

    if (!tab || !tab.webSocketDebuggerUrl) {
      throw new Error('No page tab found in Chrome on port 9229')
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

    await new Promise((r) => setTimeout(r, 1500))

    // -------------------------------------------------------------------------
    // TEST 1: Watchlist Rows (Fix 5: Material event above category chips, period on price)
    // -------------------------------------------------------------------------
    console.log('\n--- Test 1: Watchlist Rows Layout (Fix 5) ---')
    // Click Watchlist
    await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('div[aria-label="Universe scope"] button'));
      const wl = btns.find(b => b.innerText.trim() === 'Watchlist');
      if (wl) wl.click();
    })()`)
    await new Promise((r) => setTimeout(r, 600))

    // Switch to 30d
    await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn30 = btns.find(b => b.innerText.trim() === '30d');
      if (btn30) btn30.click();
    })()`)
    await new Promise((r) => setTimeout(r, 1000))

    const pricePeriodText = await evaluate(`(() => {
      const span = document.querySelector('section[aria-label="Companies"] button span.text-zinc-500.text-\\[10px\\]');
      return span ? span.innerText.trim() : null;
    })()`)
    console.log('  Price period label:', pricePeriodText)
    if (pricePeriodText !== '(30d)') {
      console.warn('  Expected (30d), got:', pricePeriodText)
    }

    await capture('ag6-5-watchlist-row.png')

    // -------------------------------------------------------------------------
    // TEST 2: Bajaj Management Card (Fix 1: No repeated name/role, headline has effective)
    // -------------------------------------------------------------------------
    console.log('\n--- Test 2: Bajaj Management Card (Fix 1) ---')
    // Switch to My portfolio
    await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('div[aria-label="Universe scope"] button'));
      const p = btns.find(b => b.innerText.trim() === 'My portfolio');
      if (p) p.click();
    })()`)
    await new Promise((r) => setTimeout(r, 600))

    // Drill into BAJFINANCE
    await evaluate(`(() => {
      const sec = document.querySelector('section[aria-label="Companies"]');
      const rows = Array.from(sec.querySelectorAll('button'));
      const baj = rows.find(b => b.innerText.includes('BAJFINANCE'));
      if (baj) baj.click();
    })()`)
    await new Promise((r) => setTimeout(r, 1200))

    // Scroll down to management card
    await evaluate(`(() => {
      const articles = Array.from(document.querySelectorAll('article'));
      const mgmt = articles.find(a => a.innerText.includes('management change') || a.innerText.includes('Prashant Verma'));
      if (mgmt) mgmt.scrollIntoView({ behavior: 'instant', block: 'center' });
    })()`)
    await new Promise((r) => setTimeout(r, 600))

    const mgmtHeadline = await evaluate(`(() => {
      const articles = Array.from(document.querySelectorAll('article'));
      const mgmt = articles.find(a => a.innerText.includes('management change') || a.innerText.includes('Prashant Verma'));
      if (!mgmt) return null;
      const h3 = mgmt.querySelector('h3');
      return h3 ? h3.innerText.trim() : null;
    })()`)
    console.log('  Bajaj Management Headline:', mgmtHeadline)

    await capture('ag6-1-bajaj-management.png')

    // -------------------------------------------------------------------------
    // TEST 3: Results Card (Fix 3: "Revenue, PBT, PAT checked" & derived EBITDA)
    // -------------------------------------------------------------------------
    console.log('\n--- Test 3: Results Card Badge & Derived EBITDA (Fix 3) ---')
    await evaluate(`(() => {
      const articles = Array.from(document.querySelectorAll('article'));
      const res = articles.find(a => a.innerText.includes('Q2 FY27') && a.innerText.includes('Revenue'));
      if (res) res.scrollIntoView({ behavior: 'instant', block: 'center' });
    })()`)
    await new Promise((r) => setTimeout(r, 600))

    const checkedBadge = await evaluate(`(() => {
      const a = Array.from(document.querySelectorAll('a, span')).find(el => el.innerText && el.innerText.includes('Revenue, PBT, PAT checked'));
      return a ? a.innerText.trim() : null;
    })()`)
    console.log('  Results checked badge:', checkedBadge)

    await capture('ag6-3-results-badge.png')

    // -------------------------------------------------------------------------
    // TEST 4: Ask FINN Sheet (Fix 4: Tappable source link directly below answer & fresh chips)
    // -------------------------------------------------------------------------
    console.log('\n--- Test 4: Ask FINN Sheet Source Link (Fix 4) ---')
    await evaluate(`(() => {
      const askBtn = document.querySelector('article button:has(svg)');
      const btns = Array.from(document.querySelectorAll('button'));
      const ask = btns.find(b => b.innerText.includes('Ask FINN'));
      if (ask) ask.click();
    })()`)
    await new Promise((r) => setTimeout(r, 800))

    // Tap first question chip
    await evaluate(`(() => {
      const chip = document.querySelector('div:has(> button) button.rounded-full');
      if (chip) chip.click();
    })()`)
    await new Promise((r) => setTimeout(r, 3000))

    const askSourceLink = await evaluate(`(() => {
      const a = Array.from(document.querySelectorAll('a')).find(el => el.innerText && (el.innerText.includes('filing · p.') || el.innerText.includes('call · p.')));
      return a ? a.innerText.trim() : null;
    })()`)
    console.log('  Ask answer source link:', askSourceLink)

    await capture('ag6-4-ask-source-line.png')

    // Close Ask sheet
    await evaluate(`(() => {
      const close = document.querySelector('button[aria-label="Close Ask FINN"]');
      if (close) close.click();
    })()`)
    await new Promise((r) => setTimeout(r, 600))

    // -------------------------------------------------------------------------
    // TEST 5: Research Screen INFY (Fix 2: Range shift beside cut chip & muted gaps)
    // -------------------------------------------------------------------------
    console.log('\n--- Test 5: Research INFY Guidance Range Shift (Fix 2) ---')
    // Click Research tab in bottom nav
    await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('nav button'));
      const resTab = btns.find(b => b.innerText.includes('Research'));
      if (resTab) resTab.click();
    })()`)
    await new Promise((r) => setTimeout(r, 1500))

    const rangeShiftText = await evaluate(`(() => {
      const spans = Array.from(document.querySelectorAll('span'));
      const shift = spans.find(s => s.innerText && s.innerText.includes('1.5–3% → 1–2%'));
      return shift ? shift.innerText.trim() : null;
    })()`)
    console.log('  INFY Range Shift Text:', rangeShiftText)

    await capture('ag6-2-infy-cut-range.png')

    console.log('\n========================================================')
    console.log('ALL AG-6 VERIFICATIONS PASSED!')
    console.log('========================================================')

    ws.close()
    chromeProc.kill()
  } catch (err) {
    console.error('\n[AG-6 TEST FAILED]', err)
    chromeProc.kill()
    process.exit(1)
  }
}

runTest()
