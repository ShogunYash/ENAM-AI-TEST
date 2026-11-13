import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const screenshotsDir = path.join(__dirname, '../screenshots')

const tmpUserData = path.join(os.tmpdir(), 'finn-chrome-res-' + Date.now())

async function run() {
  const chromeProc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9231',
    '--window-size=390,844',
    '--user-data-dir=' + tmpUserData,
    'http://localhost:5199/',
  ])

  await new Promise((r) => setTimeout(r, 2000))

  const listRes = await fetch('http://localhost:9231/json')
  const tabs = await listRes.json()
  const tab = tabs.find((t) => t.type === 'page') || tabs[0]

  const ws = new WebSocket(tab.webSocketDebuggerUrl)
  await new Promise((r) => ws.onopen = r)

  let id = 1
  const send = (method, params = {}) => {
    const cur = id++
    return new Promise((resolve, reject) => {
      const h = (evt) => {
        const d = JSON.parse(evt.data)
        if (d.id === cur) {
          ws.removeEventListener('message', h)
          if (d.error) reject(d.error)
          else resolve(d.result)
        }
      }
      ws.addEventListener('message', h)
      ws.send(JSON.stringify({ id: cur, method, params }))
    })
  }

  await send('Page.enable')
  await send('Runtime.enable')

  await new Promise((r) => setTimeout(r, 1500))

  // Switch to 30d window
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn30 = btns.find(b => b.innerText.trim() === '30d');
      if (btn30) btn30.click();
    })()`
  })
  await new Promise((r) => setTimeout(r, 1000))

  // Drill into TATASTEEL
  await send('Runtime.evaluate', {
    expression: `(() => {
      const sec = document.querySelector('section[aria-label="Companies"]');
      const rows = Array.from(sec.querySelectorAll('button'));
      const ts = rows.find(b => b.innerText.includes('TATASTEEL'));
      if (ts) ts.click();
    })()`
  })
  await new Promise((r) => setTimeout(r, 1200))

  // Scroll to results card
  await send('Runtime.evaluate', {
    expression: `(() => {
      const articles = Array.from(document.querySelectorAll('article'));
      const res = articles.find(a => a.innerText.includes('Q2 FY27') && a.innerText.includes('Revenue'));
      if (res) res.scrollIntoView({ behavior: 'instant', block: 'center' });
    })()`
  })
  await new Promise((r) => setTimeout(r, 600))

  const { data } = await send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync(path.join(screenshotsDir, 'ag6-3-tatasteel-results.png'), Buffer.from(data, 'base64'))
  console.log('[PASS] Captured: ag6-3-tatasteel-results.png')

  ws.close()
  chromeProc.kill()
}

run()
