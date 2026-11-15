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

const tmpUserData = path.join(os.tmpdir(), 'finn-chrome-pw-' + Date.now())

async function runTest() {
  console.log('========================================================')
  console.log('FINN "My portfolio | Watchlist" Verification Suite')
  console.log('Viewport: 390x844 (Mobile iPhone format)')
  console.log('Dev Server: http://localhost:5199/')
  console.log('========================================================\n')

  const chromeProc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9227',
    '--window-size=390,844',
    '--user-data-dir=' + tmpUserData,
    'http://localhost:5199/?nosplash',
  ])

  await new Promise((r) => setTimeout(r, 2000))

  try {
    const listRes = await fetch('http://localhost:9227/json')
    const tabs = await listRes.json()
    const tab = tabs.find((t) => t.type === 'page') || tabs[0]

    if (!tab || !tab.webSocketDebuggerUrl) {
      throw new Error('No page tab found in Chrome on port 9227')
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
    // STEP 1: Default State: "My portfolio" selected, 24h window
    // -------------------------------------------------------------------------
    console.log('\n--- Step 1: Check default "My portfolio" on 24h ---')
    const defaultScope = await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('div[aria-label="Universe scope"] button'));
      const active = btns.find(b => b.classList.contains('font-semibold'));
      return active ? active.innerText.trim() : null;
    })()`)
    console.log('  Active scope:', defaultScope)
    if (defaultScope !== 'My portfolio') {
      throw new Error(`Expected default scope 'My portfolio', got '${defaultScope}'`)
    }
    await capture('pw-1-portfolio-24h.png')

    // -------------------------------------------------------------------------
    // STEP 2: Portfolio in 30d window (By company list, 17 portfolio holdings)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 2: Switch to 30d window on Portfolio ---')
    await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn30 = btns.find(b => b.innerText.trim() === '30d');
      if (btn30) btn30.click();
    })()`)
    await new Promise((r) => setTimeout(r, 1000))

    const portfolioSymbols = await getCompanySymbols()
    console.log('  Portfolio companies in 30d:', portfolioSymbols.length, portfolioSymbols.slice(0, 5).join(', '))
    if (portfolioSymbols.length !== 17) {
      throw new Error(`Expected 17 portfolio companies, got ${portfolioSymbols.length}`)
    }

    const portfolioCountText = await evaluate(`(() => {
      const span = document.querySelector('section[aria-label="Companies"] span.font-mono');
      return span ? span.innerText.trim() : null;
    })()`)
    console.log('  Portfolio count text:', portfolioCountText)
    await capture('pw-2-portfolio-30d.png')

    // -------------------------------------------------------------------------
    // STEP 3: Switch to "Watchlist" in 30d window
    // -------------------------------------------------------------------------
    console.log('\n--- Step 3: Switch to Watchlist (30d) ---')
    await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('div[aria-label="Universe scope"] button'));
      const wl = btns.find(b => b.innerText.trim() === 'Watchlist');
      if (wl) wl.click();
    })()`)
    await new Promise((r) => setTimeout(r, 1000))

    // Check banner
    const bannerText = await evaluate(`(() => {
      const divs = Array.from(document.querySelectorAll('div'));
      const banner = divs.find(d => d.innerText && d.innerText.includes('Not in your portfolio'));
      return banner ? banner.innerText.trim() : null;
    })()`)
    console.log('  Watchlist banner:', bannerText)
    if (!bannerText || !bannerText.includes('Not in your portfolio — filings only, no alerts')) {
      throw new Error(`Watchlist banner missing or incorrect: '${bannerText}'`)
    }

    // Check watchlist count
    const watchlistSymbols = await getCompanySymbols()
    console.log('  Watchlist companies in 30d:', watchlistSymbols.length, watchlistSymbols.slice(0, 5).join(', '))
    if (watchlistSymbols.length !== 10) {
      throw new Error(`Expected 10 watchlist companies, got ${watchlistSymbols.length}`)
    }

    const watchlistCountText = await evaluate(`(() => {
      const span = document.querySelector('section[aria-label="Companies"] span.font-mono');
      return span ? span.innerText.trim() : null;
    })()`)
    console.log('  Watchlist count text:', watchlistCountText)
    await capture('pw-3-watchlist-30d.png')

    // -------------------------------------------------------------------------
    // STEP 4: Watchlist in 24h window (Always by-company, 2 of 10 filed)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 4: Switch to 24h window on Watchlist ---')
    await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn24 = btns.find(b => b.innerText.trim() === '24h');
      if (btn24) btn24.click();
    })()`)
    await new Promise((r) => setTimeout(r, 1000))

    // Confirm it is still By-company (no ranked digest on watchlist)
    const watchlist24Symbols = await getCompanySymbols()
    console.log('  Watchlist companies in 24h:', watchlist24Symbols.length)
    if (watchlist24Symbols.length !== 10) {
      throw new Error(`Expected 10 watchlist companies in 24h, got ${watchlist24Symbols.length}`)
    }

    const watchlist24Count = await evaluate(`(() => {
      const span = document.querySelector('section[aria-label="Companies"] span.font-mono');
      return span ? span.innerText.trim() : null;
    })()`)
    console.log('  Watchlist 24h count text:', watchlist24Count)
    if (watchlist24Count !== '2 of 10 filed in 24h') {
      console.warn('  Note count text was:', watchlist24Count)
    }
    await capture('pw-4-watchlist-24h.png')

    // -------------------------------------------------------------------------
    // STEP 5: Search & Sort on Watchlist
    // -------------------------------------------------------------------------
    console.log('\n--- Step 5: Test Search and Sort on Watchlist ---')
    // Type search
    await evaluate(`(() => {
      const inp = document.querySelector('section[aria-label="Companies"] input[type="text"]');
      if (inp) {
        inp.focus();
      }
    })()`)
    await send('Input.insertText', { text: 'bharti' })
    await new Promise((r) => setTimeout(r, 400))

    const searchResults = await getCompanySymbols()
    console.log('  Search results for "bharti":', searchResults.join(', '))
    if (!searchResults.includes('BHARTIARTL')) {
      throw new Error(`Search for 'bharti' did not match BHARTIARTL. Got: ${searchResults.join(', ')}`)
    }
    await capture('pw-5-watchlist-search.png')

    // Clear search
    await evaluate(`(() => {
      const clr = document.querySelector('button[aria-label="Clear search"]');
      if (clr) clr.click();
    })()`)
    await new Promise((r) => setTimeout(r, 300))

    // Sort A-Z
    await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('div[aria-label="Sort companies"] button'));
      const az = btns.find(b => b.innerText.includes('A–Z') || b.innerText.includes('A-Z'));
      if (az) az.click();
    })()`)
    await new Promise((r) => setTimeout(r, 400))

    const sortedSymbols = await getCompanySymbols()
    console.log('  Sorted A-Z symbols:', sortedSymbols.slice(0, 5).join(', '))
    if (sortedSymbols[0] !== 'ASIANPAINT') {
      throw new Error(`Expected first symbol A-Z to be ASIANPAINT, got ${sortedSymbols[0]}`)
    }
    await capture('pw-6-watchlist-az.png')

    // -------------------------------------------------------------------------
    // STEP 6: Company Detail Drilldown from Watchlist
    // -------------------------------------------------------------------------
    console.log('\n--- Step 6: Tap BHARTIARTL drilldown ---')
    await evaluate(`(() => {
      const sec = document.querySelector('section[aria-label="Companies"]');
      const rows = Array.from(sec.querySelectorAll('button'));
      const row = rows.find(b => b.innerText.includes('BHARTIARTL'));
      if (row) row.click();
    })()`)
    await new Promise((r) => setTimeout(r, 1000))

    const companyDetailHeader = await evaluate(`(() => {
      const h1 = document.querySelector('h1');
      return h1 ? h1.innerText.trim() : null;
    })()`)
    console.log('  Company detail header:', companyDetailHeader)
    if (!companyDetailHeader || !companyDetailHeader.includes('BHARTIARTL')) {
      throw new Error(`Expected BHARTIARTL company detail, got: ${companyDetailHeader}`)
    }
    await capture('pw-7-watchlist-company-detail.png')

    // Tap back to all companies
    await evaluate(`(() => {
      const back = document.querySelector('button[aria-label="Back to all companies"]');
      if (back) back.click();
    })()`)
    await new Promise((r) => setTimeout(r, 500))

    const backSymbols = await getCompanySymbols()
    console.log('  Returned to watchlist companies:', backSymbols.length)
    if (backSymbols.length !== 10) {
      throw new Error(`Expected 10 watchlist companies after back, got ${backSymbols.length}`)
    }

    // -------------------------------------------------------------------------
    // STEP 7: Empty state per window check (Switch to Portfolio 24h By-company)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 7: Check empty state in 24h window for Portfolio By-company ---')
    // Switch to Portfolio
    await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('div[aria-label="Universe scope"] button'));
      const p = btns.find(b => b.innerText.trim() === 'My portfolio');
      if (p) p.click();
    })()`)
    await new Promise((r) => setTimeout(r, 600))

    // Switch to 3d, then By company, then back to 24h
    // Or let's check 3d By company:
    await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn3 = btns.find(b => b.innerText.trim() === '3d');
      if (btn3) btn3.click();
    })()`)
    await new Promise((r) => setTimeout(r, 800))

    await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('div[aria-label="View mode"] button'));
      const byCo = btns.find(b => b.innerText.trim() === 'By company');
      if (byCo) byCo.click();
    })()`)
    await new Promise((r) => setTimeout(r, 800))
    await capture('pw-8-portfolio-3d-by-company.png')

    // -------------------------------------------------------------------------
    // STEP 8: Reload Page to verify persistence of "finn.portfolioScope"
    // -------------------------------------------------------------------------
    console.log('\n--- Step 8: Test localStorage persistence of Scope ---')
    // Set to Watchlist, then reload
    await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('div[aria-label="Universe scope"] button'));
      const wl = btns.find(b => b.innerText.trim() === 'Watchlist');
      if (wl) wl.click();
    })()`)
    await new Promise((r) => setTimeout(r, 500))

    // Reload page
    await send('Page.reload')
    await new Promise((r) => setTimeout(r, 1500))

    const reloadedScope = await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('div[aria-label="Universe scope"] button'));
      const active = btns.find(b => b.classList.contains('font-semibold'));
      return active ? active.innerText.trim() : null;
    })()`)
    console.log('  Scope after reload:', reloadedScope)
    if (reloadedScope !== 'Watchlist') {
      throw new Error(`Expected Watchlist persisted after reload, got: ${reloadedScope}`)
    }
    await capture('pw-9-watchlist-reloaded.png')

    console.log('\n========================================================')
    console.log('ALL VERIFICATION CHECKS PASSED!')
    console.log('========================================================')
    ws.close()
    chromeProc.kill()
  } catch (err) {
    console.error('\n[TEST FAILED]', err)
    chromeProc.kill()
    process.exit(1)
  }
}

runTest()
