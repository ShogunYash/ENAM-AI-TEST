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

const tmpUserData = path.join(os.tmpdir(), 'finn-chrome-offline-bycompany-' + Date.now())

async function runOfflineTest() {
  console.log('====================================================')
  console.log('Testing Unreachable API (VITE_API_BASE=http://localhost:9)')
  console.log('Requirement: SNAPSHOT chip shows and By company works offline for 3d, 7d, 30d')
  console.log('====================================================\n')

  // Start temporary offline vite server on port 5198
  const offlineVite = spawn('cmd.exe', ['/c', 'set VITE_API_BASE=http://localhost:9&& npm run dev -- --port 5198 --strictPort'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'ignore',
  })

  await new Promise((r) => setTimeout(r, 2000))

  const chromeProc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9227',
    '--window-size=390,844',
    '--user-data-dir=' + tmpUserData,
    'http://localhost:5198/',
  ])

  await new Promise((r) => setTimeout(r, 2000))

  try {
    const listRes = await fetch('http://localhost:9227/json')
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

    // Wait for initial load
    await new Promise((r) => setTimeout(r, 2000))

    // 1. Verify SNAPSHOT chip is displayed
    const hasSnapshotChip = await evaluate(`document.body.innerText.includes('SNAPSHOT')`)
    console.log('  Snapshot chip visible:', hasSnapshotChip)
    if (!hasSnapshotChip) throw new Error('[FAIL] SNAPSHOT chip not visible in offline mode')
    console.log('  ✓ Verified: SNAPSHOT chip is visible when API is unreachable')

    // 2. Test 7d window By company offline
    console.log('\n  Switching to 7d window...')
    await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn7 = btns.find(b => b.innerText.trim() === '7d');
      if (btn7) btn7.click();
    })()`)
    await new Promise((r) => setTimeout(r, 800))

    console.log('  Clicking "By company" toggle...')
    await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const byCompBtn = btns.find(b => b.innerText.trim() === 'By company');
      if (byCompBtn) byCompBtn.click();
    })()`)
    await new Promise((r) => setTimeout(r, 1200))

    // Verify 7d companies loaded from snapshot (17 companies)
    const symbols7dOffline = await evaluate(`(() => {
      const sec = document.querySelector('section[aria-label="Companies"]');
      if (!sec) return [];
      return Array.from(sec.querySelectorAll('button span.font-mono.font-bold')).map(s => s.innerText.trim());
    })()`)
    console.log('  7d Offline By company symbols:', symbols7dOffline.slice(0, 5), '... total:', symbols7dOffline.length)
    if (symbols7dOffline.length !== 17) {
      throw new Error(`[FAIL] Expected 17 companies in offline 7d By company, got ${symbols7dOffline.length}`)
    }
    console.log('  ✓ Verified: 7d By company loaded 17 companies from snapshot offline!')
    await capture('company-8-offline-7d-by-company.png')

    // 3. Test 3d window By company offline
    console.log('\n  Testing 3d window By company offline...')
    await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn3 = btns.find(b => b.innerText.trim() === '3d');
      if (btn3) btn3.click();
    })()`)
    await new Promise((r) => setTimeout(r, 800))

    // Switch to By company on 3d
    await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const byCompBtn = btns.find(b => b.innerText.trim() === 'By company');
      if (byCompBtn) byCompBtn.click();
    })()`)
    await new Promise((r) => setTimeout(r, 1000))

    const symbols3dOffline = await evaluate(`(() => {
      const sec = document.querySelector('section[aria-label="Companies"]');
      if (!sec) return [];
      return Array.from(sec.querySelectorAll('button span.font-mono.font-bold')).map(s => s.innerText.trim());
    })()`)
    console.log('  3d Offline By company symbols count:', symbols3dOffline.length)
    if (symbols3dOffline.length !== 17) {
      throw new Error(`[FAIL] Expected 17 companies in offline 3d By company, got ${symbols3dOffline.length}`)
    }
    console.log('  ✓ Verified: 3d By company works offline from snapshot')

    // 4. Test 30d window offline
    console.log('\n  Testing 30d window By company offline...')
    await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn30 = btns.find(b => b.innerText.trim() === '30d');
      if (btn30) btn30.click();
    })()`)
    await new Promise((r) => setTimeout(r, 1000))

    const symbols30dOffline = await evaluate(`(() => {
      const sec = document.querySelector('section[aria-label="Companies"]');
      if (!sec) return [];
      return Array.from(sec.querySelectorAll('button span.font-mono.font-bold')).map(s => s.innerText.trim());
    })()`)
    console.log('  30d Offline By company symbols count:', symbols30dOffline.length)
    if (symbols30dOffline.length !== 17) {
      throw new Error(`[FAIL] Expected 17 companies in offline 30d By company, got ${symbols30dOffline.length}`)
    }
    console.log('  ✓ Verified: 30d By company works offline from snapshot')

    console.log('\n====================================================')
    console.log('OFFLINE VERIFICATION PASSED FOR 3d, 7d, AND 30d!')
    console.log('====================================================')
  } finally {
    try {
      chromeProc.kill()
    } catch {}
    try {
      offlineVite.kill()
    } catch {}
    try {
      await new Promise((r) => setTimeout(r, 500))
      fs.rmSync(tmpUserData, { recursive: true, force: true })
    } catch {}
  }
}

runOfflineTest().catch((e) => {
  console.error(e)
  process.exit(1)
})
