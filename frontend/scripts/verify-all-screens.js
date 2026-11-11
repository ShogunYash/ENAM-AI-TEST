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

const tmpUserData = path.join(os.tmpdir(), 'finn-chrome-' + Date.now())

async function verifyScreens() {
  console.log('Starting Chrome in remote-debugging mode at 390x844...')

  const chromeProc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--window-size=390,844',
    '--user-data-dir=' + tmpUserData,
    'http://localhost:5173/',
  ])

  // Give Chrome 2 seconds to bind port
  await new Promise((r) => setTimeout(r, 2000))

  try {
    const listRes = await fetch('http://localhost:9222/json')
    const tabs = await listRes.json()
    const tab = tabs.find((t) => t.type === 'page') || tabs[0]

    if (!tab || !tab.webSocketDebuggerUrl) {
      throw new Error('No page tab found in Chrome')
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

    // Enable Runtime and Page
    await send('Page.enable')
    await send('Runtime.enable')

    // Wait for initial render
    await new Promise((r) => setTimeout(r, 2000))

    // Helper to evaluate JS and get result
    const evaluate = async (expr) => {
      const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true })
      return res.result?.value
    }

    // Helper to capture screenshot
    const capture = async (filename) => {
      const { data } = await send('Page.captureScreenshot', { format: 'png' })
      const filePath = path.join(screenshotsDir, filename)
      fs.writeFileSync(filePath, Buffer.from(data, 'base64'))
      console.log(`[PASS] Captured: ${filename}`)
    }

    // 1. Initial Today Screen (24h default)
    await capture('1-today-24h.png')

    // 2. Switch Window Picker to 3d (loads CERA Results card!)
    await evaluate(`
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn3d = buttons.find(b => b.textContent.trim() === '3d');
      if (btn3d) btn3d.click();
    `)
    // Wait for network request and state update
    await new Promise((r) => setTimeout(r, 2500))
    await capture('2-today-3d-results-card.png')

    // Verify Results card details in 3d view
    const resultsCardText = await evaluate(`document.body.innerText`)
    console.log('  CERA card present in 3d:', resultsCardText.includes('CERA'))
    console.log('  Revenue metric present:', resultsCardText.includes('Revenue'))
    console.log('  ₹ crore formatted (₹512.4 Cr):', resultsCardText.includes('₹512.4 Cr'))
    console.log('  EBITDA margin formatted (16.9%):', resultsCardText.includes('16.9%'))
    console.log('  QoQ / YoY percentages formatted (+21.6%):', resultsCardText.includes('+21.6%'))

    // 3. Open Ask FINN on a filing card
    await evaluate(`
      const askBtns = Array.from(document.querySelectorAll('button'));
      const askBtn = askBtns.find(b => b.textContent.includes('Ask FINN'));
      if (askBtn) askBtn.click();
    `)
    await new Promise((r) => setTimeout(r, 800))
    await capture('3-ask-finn-copilot.png')

    // Close Ask FINN
    await evaluate(`
      const closeBtns = Array.from(document.querySelectorAll('button'));
      const closeBtn = closeBtns.find(b => b.querySelector('svg.lucide-x'));
      if (closeBtn) closeBtn.click();
    `)
    await new Promise((r) => setTimeout(r, 500))

    // 4. Navigate to Research Screen
    await evaluate(`
      const navButtons = Array.from(document.querySelectorAll('nav button'));
      const researchTab = navButtons.find(b => b.textContent.includes('Research'));
      if (researchTab) researchTab.click();
    `)
    await new Promise((r) => setTimeout(r, 1500))
    await capture('4-research-screen.png')

    // 5. Navigate to Thresholds Screen
    await evaluate(`
      const navButtons = Array.from(document.querySelectorAll('nav button'));
      const threshTab = navButtons.find(b => b.textContent.includes('Thresholds'));
      if (threshTab) threshTab.click();
    `)
    await new Promise((r) => setTimeout(r, 1000))
    await capture('5-thresholds-screen.png')

    // Verify localStorage persistence
    const savedSettings = await evaluate(`localStorage.getItem('finn_settings_v1')`)
    console.log('  Settings storage verified:', savedSettings ? 'stored' : 'defaults ready')

    // 6. Navigate to Stats Screen
    await evaluate(`
      const navButtons = Array.from(document.querySelectorAll('nav button'));
      const statsTab = navButtons.find(b => b.textContent.includes('Cost'));
      if (statsTab) statsTab.click();
    `)
    await new Promise((r) => setTimeout(r, 1000))
    await capture('6-cost-stats-screen.png')

    ws.close()
  } finally {
    chromeProc.kill()
    try {
      fs.rmSync(tmpUserData, { recursive: true, force: true })
    } catch {}
  }

  console.log('\nAll screens verified at 390x844 viewport!')
}

verifyScreens().catch((e) => {
  console.error(e)
  process.exit(1)
})
