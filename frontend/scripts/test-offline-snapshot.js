import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const screenshotsDir = path.join(__dirname, '../screenshots')
const envPath = path.join(__dirname, '../.env')
const envBakPath = path.join(__dirname, '../.env.bak')

const tmpUserData = path.join(os.tmpdir(), 'finn-chrome-offline-' + Date.now())

async function testOffline() {
  console.log('====================================================')
  console.log('Testing Unreachable API fallback (VITE_API_BASE=http://localhost:9)')
  console.log('Requirement: MUST show SNAPSHOT chip and still render')
  console.log('====================================================\n')

  // Back up existing .env and set VITE_API_BASE to unreachable port
  if (fs.existsSync(envPath)) {
    fs.copyFileSync(envPath, envBakPath)
  }
  fs.writeFileSync(envPath, 'VITE_API_BASE=http://localhost:9\n')

  let devProc = null
  let chromeProc = null

  try {
    devProc = spawn('cmd.exe', [
      '/c',
      'npm run dev -- --port 5198'
    ], {
      cwd: path.join(__dirname, '..'),
      stdio: 'ignore'
    })

    // Wait for server on 5198
    let ready = false
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 500))
      try {
        const res = await fetch('http://localhost:5198/')
        if (res.ok) {
          ready = true
          break
        }
      } catch {}
    }

    if (!ready) {
      throw new Error('Failed to start dev server on port 5198')
    }

    chromeProc = spawn(chromePath, [
      '--headless=new',
      '--remote-debugging-port=9226',
      '--window-size=390,844',
      '--user-data-dir=' + tmpUserData,
      'http://localhost:5198/',
    ])

    await new Promise((r) => setTimeout(r, 2000))

    const listRes = await fetch('http://localhost:9226/json')
    const tabs = await listRes.json()
    const tab = tabs.find((t) => t.type === 'page') || tabs[0]

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

    // Wait for network timeout and snapshot fallback
    await new Promise((r) => setTimeout(r, 3500))

    const { data } = await send('Page.captureScreenshot', { format: 'png' })
    const filePath = path.join(screenshotsDir, '10-offline-snapshot.png')
    fs.writeFileSync(filePath, Buffer.from(data, 'base64'))
    console.log('[PASS] Captured: 10-offline-snapshot.png')

    const res = await send('Runtime.evaluate', { expression: 'document.body.innerText', returnByValue: true })
    const bodyText = res.result?.value || ''

    // Assert SNAPSHOT chip is displayed
    if (!bodyText.includes('SNAPSHOT')) {
      throw new Error('[FAIL] Unreachable API did not display SNAPSHOT chip: ' + bodyText.slice(0, 200))
    }
    console.log('  ✓ Verified: SNAPSHOT chip is displayed when API is unreachable')

    // Assert UI renders without crashing (Needs you, window picker, navigation)
    if (!bodyText.toUpperCase().includes('NEEDS YOU') || !bodyText.includes('Today')) {
      throw new Error('[FAIL] Offline fallback failed to render snapshot layout')
    }
    console.log('  ✓ Verified: Complete UI renders from snapshot data when offline')

    ws.close()
  } finally {
    if (chromeProc) chromeProc.kill()
    if (devProc) devProc.kill()
    if (fs.existsSync(envBakPath)) {
      fs.copyFileSync(envBakPath, envPath)
      fs.unlinkSync(envBakPath)
    } else {
      fs.writeFileSync(envPath, 'VITE_API_BASE=http://localhost:8001\n')
    }
    try {
      fs.rmSync(tmpUserData, { recursive: true, force: true })
    } catch {}
  }

  console.log('\n====================================================')
  console.log('Offline / Unreachable API Test PASSED!')
  console.log('====================================================\n')
}

testOffline().catch((err) => {
  console.error('\nOFFLINE TEST FAILED:', err.message)
  process.exit(1)
})
