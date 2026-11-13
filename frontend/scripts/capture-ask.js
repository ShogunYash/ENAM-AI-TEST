import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const screenshotsDir = path.join(__dirname, '../screenshots')

const tmpUserData = path.join(os.tmpdir(), 'finn-chrome-ask-' + Date.now())

async function run() {
  const chromeProc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9230',
    '--window-size=390,844',
    '--user-data-dir=' + tmpUserData,
    'http://localhost:5199/',
  ])

  await new Promise((r) => setTimeout(r, 2000))

  const listRes = await fetch('http://localhost:9230/json')
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

  // Wait for initial render on Today (has 24h cards or switch to 30d)
  await new Promise((r) => setTimeout(r, 1500))

  // Switch to 3d or 7d or click Ask FINN on a card
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn30 = btns.find(b => b.innerText.trim() === '3d');
      if (btn30) btn30.click();
    })()`
  })
  await new Promise((r) => setTimeout(r, 1000))

  // Find and click "Ask FINN" button on the first filing card
  const askClicked = await send('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const ask = btns.find(b => b.innerText.includes('Ask FINN'));
      if (ask) {
        ask.click();
        return true;
      }
      return false;
    })()`,
    returnByValue: true
  })
  console.log('Ask FINN clicked:', askClicked.result.value)
  await new Promise((r) => setTimeout(r, 1000))

  // Click the first suggested question chip
  const promptClicked = await send('Runtime.evaluate', {
    expression: `(() => {
      const chips = Array.from(document.querySelectorAll('div.overflow-x-auto button'));
      if (chips.length > 0) {
        const text = chips[0].innerText.trim();
        chips[0].click();
        return text;
      }
      return null;
    })()`,
    returnByValue: true
  })
  console.log('Prompt chip clicked:', promptClicked.result.value)

  // Wait for LLM or answer to return
  await new Promise((r) => setTimeout(r, 6000))

  // Capture screenshot of Ask sheet with answer and source link
  const { data } = await send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync(path.join(screenshotsDir, 'ag6-4-ask-source-line.png'), Buffer.from(data, 'base64'))
  console.log('[PASS] Captured: ag6-4-ask-source-line.png')

  ws.close()
  chromeProc.kill()
}

run()
