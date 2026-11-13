import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const screenshotsDir = path.join(__dirname, '../screenshots')

const tmpUserData = path.join(os.tmpdir(), 'finn-chrome-offline-pw-' + Date.now())

async function runTest() {
  console.log('========================================================')
  console.log('FINN Offline Snapshot "Portfolio | Watchlist" Verification')
  console.log('API Base: http://localhost:9 (Unreachable API)')
  console.log('Frontend Port: 5198')
  console.log('========================================================\n')

  // Start offline vite server on 5198
  const viteProc = spawn('cmd.exe', [
    '/c',
    'set VITE_API_BASE=http://localhost:9&& npx vite --port 5198 --strictPort'
  ], {
    cwd: path.join(__dirname, '..'),
    stdio: 'ignore'
  })

  await new Promise((r) => setTimeout(r, 2000))

  const chromeProc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9228',
    '--window-size=390,844',
    '--user-data-dir=' + tmpUserData,
    'http://localhost:5198/',
  ])

  await new Promise((r) => setTimeout(r, 2000))

  try {
    const listRes = await fetch('http://localhost:9228/json')
    const tabs = await listRes.json()
    const tab = tabs.find((t) => t.type === 'page') || tabs[0]

    if (!tab || !tab.webSocketDebuggerUrl) {
      throw new Error('No page tab found in Chrome on port 9228')
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

    const getCompanySymbols = async () => {
      return await evaluate(`(() => {
        const sec = document.querySelector('section[aria-label="Companies"]');
        if (!sec) return [];
        return Array.from(sec.querySelectorAll('button span.font-mono.font-bold')).map(s => s.innerText.trim());
      })()`)
    }

    console.log('--- Step 1: Check offline provenance badge ---')
    const chipText = await evaluate(`(() => {
      const chip = document.querySelector('header button, div button span');
      return document.body.innerText.includes('DEMO DATA') || document.body.innerText.includes('SNAPSHOT');
    })()`)
    console.log('  Offline mode badge verified:', chipText)

    console.log('\n--- Step 2: Switch to 30d window on Portfolio (Offline) ---')
    await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn30 = btns.find(b => b.innerText.trim() === '30d');
      if (btn30) btn30.click();
    })()`)
    await new Promise((r) => setTimeout(r, 1000))

    const pSymbols = await getCompanySymbols()
    console.log('  Offline Portfolio 30d count:', pSymbols.length)
    if (pSymbols.length !== 17) {
      throw new Error(`Expected 17 portfolio companies offline, got ${pSymbols.length}`)
    }
    await capture('pw-10-offline-portfolio-30d.png')

    console.log('\n--- Step 3: Switch to Watchlist 30d (Offline) ---')
    await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('div[aria-label="Universe scope"] button'));
      const wl = btns.find(b => b.innerText.trim() === 'Watchlist');
      if (wl) wl.click();
    })()`)
    await new Promise((r) => setTimeout(r, 1000))

    const wSymbols = await getCompanySymbols()
    console.log('  Offline Watchlist 30d count:', wSymbols.length)
    if (wSymbols.length !== 10) {
      throw new Error(`Expected 10 watchlist companies offline, got ${wSymbols.length}`)
    }
    await capture('pw-11-offline-watchlist-30d.png')

    console.log('\n--- Step 4: Drill into BHARTIARTL (Offline) ---')
    await evaluate(`(() => {
      const sec = document.querySelector('section[aria-label="Companies"]');
      const rows = Array.from(sec.querySelectorAll('button'));
      const row = rows.find(b => b.innerText.includes('BHARTIARTL'));
      if (row) row.click();
    })()`)
    await new Promise((r) => setTimeout(r, 1000))

    const detailText = await evaluate(`(() => {
      const h1 = document.querySelector('h1');
      return h1 ? h1.innerText.trim() : null;
    })()`)
    console.log('  Offline company detail:', detailText)
    if (!detailText || !detailText.includes('BHARTIARTL')) {
      throw new Error(`Expected BHARTIARTL detail offline, got ${detailText}`)
    }
    await capture('pw-12-offline-watchlist-detail.png')

    console.log('\n========================================================')
    console.log('OFFLINE VERIFICATION PASSED PERFECTLY!')
    console.log('========================================================')

    ws.close()
    chromeProc.kill()
    try {
      spawn('taskkill', ['/F', '/T', '/PID', viteProc.pid.toString()])
    } catch {}
  } catch (err) {
    console.error('\n[OFFLINE TEST FAILED]', err)
    chromeProc.kill()
    try {
      spawn('taskkill', ['/F', '/T', '/PID', viteProc.pid.toString()])
    } catch {}
    process.exit(1)
  }
}

runTest()
