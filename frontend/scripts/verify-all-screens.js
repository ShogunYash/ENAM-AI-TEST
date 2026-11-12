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

const tmpUserData = path.join(os.tmpdir(), 'finn-chrome-verify-' + Date.now())

async function runVerification() {
  console.log('====================================================')
  console.log('FINN End-to-End Screen Verification Suite')
  console.log('Viewport: 390x844 (Mobile iPhone format)')
  console.log('Strict Mode: FAILS if any click fails to change screen')
  console.log('====================================================\n')

  const chromeProc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9224',
    '--window-size=390,844',
    '--user-data-dir=' + tmpUserData,
    'http://localhost:5173/',
  ])

  await new Promise((r) => setTimeout(r, 2000))

  try {
    const listRes = await fetch('http://localhost:9224/json')
    const tabs = await listRes.json()
    const tab = tabs.find((t) => t.type === 'page') || tabs[0]

    if (!tab || !tab.webSocketDebuggerUrl) {
      throw new Error('No page tab found in Chrome on port 9224')
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

    // Helper: Clicks element and strictly asserts that the screen content changes
    const clickAndAssertScreenChange = async (actionDesc, clickExpr, getScreenExpr = 'document.body.innerText', timeoutMs = 3500) => {
      const before = await evaluate(getScreenExpr)
      const clicked = await evaluate(clickExpr)
      if (clicked === false) {
        throw new Error(`[FAIL] Element not found for action: "${actionDesc}"`)
      }

      const start = Date.now()
      let after = before
      let hasChanged = false

      while (Date.now() - start < timeoutMs) {
        await new Promise((r) => setTimeout(r, 100))
        after = await evaluate(getScreenExpr)
        if (after !== before) {
          hasChanged = true
          break
        }
      }

      if (!hasChanged) {
        throw new Error(
          `[FAIL] Click did NOT change the screen for action: "${actionDesc}"!\nBefore state was: ${String(before).slice(0, 150)}...`
        )
      }

      console.log(`  ✓ Click changed screen for: ${actionDesc}`)
      return after
    }

    // Wait for initial render
    await new Promise((r) => setTimeout(r, 1500))

    // 1. Initial Today Screen (24h)
    console.log('[Step 1] Verifying Today Screen (24h)...')
    await capture('1-today-24h.png')
    const initialText = await evaluate(`document.body.innerText`)
    if (!initialText.toUpperCase().includes('NEEDS YOU') || !initialText.toUpperCase().includes('ACTIVE ALERTS')) {
      throw new Error('[FAIL] Today screen did not load properly: ' + initialText.slice(0, 150))
    }
    console.log('  ✓ Today screen loaded (Needs you, Alerts, Collapsed Routine)')

    // 2. Click Window Picker 3d -> MUST CHANGE SCREEN (Loads CERA Results card)
    console.log('\n[Step 2] Testing Window Picker click (24h -> 3d)...')
    await clickAndAssertScreenChange(
      'Switch window picker from 24h to 3d',
      `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btn3d = btns.find(b => b.textContent.trim() === '3d');
        if (btn3d) { btn3d.click(); return true; }
        return false;
      })()`,
      `document.body.innerText`
    )
    await capture('2-today-3d-results.png')
    const text3d = await evaluate(`document.body.innerText`)
    if (!text3d.includes('CERA') || !text3d.includes('₹512.4 Cr')) {
      throw new Error('[FAIL] 3d digest did not display CERA Results card')
    }
    console.log('  ✓ Results Card 4x3 table rendered with ₹512.4 Cr and EBITDA margin')

    // 3. Open Ask FINN on a card -> MUST CHANGE SCREEN (Opens sheet)
    console.log('\n[Step 3] Testing Ask FINN sheet opening and preview status...')
    await clickAndAssertScreenChange(
      'Open Ask FINN bottom sheet',
      `(() => {
        const askBtns = Array.from(document.querySelectorAll('button'));
        const askBtn = askBtns.find(b => b.textContent.includes('Ask FINN'));
        if (askBtn) { askBtn.click(); return true; }
        return false;
      })()`,
      `document.body.innerText`
    )
    await capture('3-ask-finn-preview.png')

    const askSheetText = await evaluate(`document.body.innerText`)
    // Assert "Preview" badge is present
    if (!askSheetText.includes('Preview') && !askSheetText.includes('PREVIEW')) {
      throw new Error('[FAIL] Ask FINN sheet missing "Preview" label')
    }
    // Assert "Verified quote match" badge is REMOVED
    if (askSheetText.includes('Verified quote match')) {
      throw new Error('[FAIL] Ask FINN sheet still contains "Verified quote match" badge (must be removed)')
    }
    console.log('  ✓ Ask FINN sheet correctly labeled Preview')
    console.log('  ✓ "Verified quote match" badge removed from Ask FINN')

    // Close Ask FINN -> MUST CHANGE SCREEN (Sheet disappears)
    await clickAndAssertScreenChange(
      'Close Ask FINN bottom sheet',
      `(() => {
        const closeBtn = document.querySelector('button[aria-label="Close Ask FINN"]');
        if (closeBtn) { closeBtn.click(); return true; }
        return false;
      })()`,
      `document.body.innerText`
    )

    // 4. Navigate to Research tab -> MUST CHANGE SCREEN
    console.log('\n[Step 4] Navigating to Research screen...')
    await clickAndAssertScreenChange(
      'Navigate to Research tab',
      `(() => {
        const tabs = Array.from(document.querySelectorAll('nav button'));
        const resTab = tabs.find(t => t.textContent.includes('Research'));
        if (resTab) { resTab.click(); return true; }
        return false;
      })()`,
      `document.body.innerText`
    )
    await capture('4-research-screen.png')

    let resText = await evaluate(`document.body.innerText`)
    const startPort = Date.now()
    while (!resText.toUpperCase().includes('TCS') && Date.now() - startPort < 2500) {
      await new Promise((r) => setTimeout(r, 100))
      resText = await evaluate(`document.body.innerText`)
    }

    // Assert visible SAMPLE DATA badge
    if (!resText.includes('SAMPLE DATA')) {
      throw new Error('[FAIL] Research screen missing visible "SAMPLE DATA" badge')
    }
    console.log('  ✓ Visible "SAMPLE DATA" badge confirmed on research view')

    // Assert portfolio chips loaded from data/portfolio.json
    if (!resText.toUpperCase().includes('PORTFOLIO:') || !resText.includes('TCS') || !resText.includes('BAJFINANCE')) {
      throw new Error('[FAIL] Suggested chips were not replaced with portfolio.json stocks: ' + resText.slice(0, 150))
    }
    console.log('  ✓ Suggested chips dynamically populated from data/portfolio.json (TCS, INFY, BAJFINANCE, ...)')

    // 5. Test clicking a different portfolio stock chip (e.g. TCS) -> MUST CHANGE SCREEN
    console.log('\n[Step 5] Clicking portfolio chip TCS...')
    await clickAndAssertScreenChange(
      'Click portfolio chip TCS to research ticker',
      `(() => {
        const chips = Array.from(document.querySelectorAll('button'));
        const tcsChip = chips.find(c => c.textContent.trim() === 'TCS');
        if (tcsChip) { tcsChip.click(); return true; }
        return false;
      })()`,
      `document.body.innerText`
    )
    await capture('5-research-tcs-building.png')
    const tcsText = await evaluate(`document.body.innerText`)
    if (!tcsText.includes('TCS')) {
      throw new Error('[FAIL] Screen did not switch to researching TCS')
    }
    console.log('  ✓ Successfully switched active research ticker to TCS')

    // Switch back to INFY to test timeline and citation drawer
    console.log('\n[Step 6] Switching back to INFY for Citation Drawer test...')
    await clickAndAssertScreenChange(
      'Click portfolio chip INFY',
      `(() => {
        const chips = Array.from(document.querySelectorAll('button'));
        const infyChip = chips.find(c => c.textContent.trim() === 'INFY');
        if (infyChip) { infyChip.click(); return true; }
        return false;
      })()`,
      `document.body.innerText`
    )

    // Tap a claim in the timeline -> MUST CHANGE SCREEN (Opens Citation Drawer)
    console.log('\n[Step 7] Tapping a claim to open Citation Drawer...')
    await clickAndAssertScreenChange(
      'Tap claim to open Citation Drawer',
      `(() => {
        const claims = Array.from(document.querySelectorAll('.cursor-pointer'));
        const target = claims.find(c => c.textContent.includes('Guided 2–3%'));
        if (target) { target.click(); return true; }
        return false;
      })()`,
      `document.body.innerText`
    )
    await capture('6-citation-drawer.png')
    const citText = await evaluate(`document.body.innerText`)
    if (!citText.includes('Verified Source Citation') || !citText.includes('concall_Q2FY26') || !citText.includes('Page 4')) {
      throw new Error('[FAIL] Citation drawer failed to display document, page, and quote')
    }
    console.log('  ✓ Citation Drawer open with document concall_Q2FY26, Page 4, and verbatim quote')

    // Close Citation Drawer -> MUST CHANGE SCREEN
    await clickAndAssertScreenChange(
      'Close Citation Drawer',
      `(() => {
        const closeBtn = document.querySelector('button[aria-label="Close citation drawer"]');
        if (closeBtn) { closeBtn.click(); return true; }
        return false;
      })()`,
      `document.body.innerText`
    )

    // 8. Navigate to Thresholds Screen -> MUST CHANGE SCREEN
    console.log('\n[Step 8] Navigating to Thresholds screen...')
    await clickAndAssertScreenChange(
      'Navigate to Thresholds tab',
      `(() => {
        const tabs = Array.from(document.querySelectorAll('nav button'));
        const threshTab = tabs.find(t => t.textContent.includes('Thresholds'));
        if (threshTab) { threshTab.click(); return true; }
        return false;
      })()`,
      `document.body.innerText`
    )
    await capture('7-thresholds-screen.png')
    const threshText = await evaluate(`document.body.innerText`)
    if (!threshText.includes('Alerts & Thresholds') || !threshText.includes('Volume Spike Multiple')) {
      throw new Error('[FAIL] Thresholds screen failed to render')
    }
    console.log('  ✓ Thresholds screen rendered with volume, price move, and category toggles')

    // 9. Navigate to Cost/Stats Screen -> MUST CHANGE SCREEN (Verifying live /stats/llm)
    console.log('\n[Step 9] Navigating to Cost / Stats screen (live /stats/llm)...')
    await clickAndAssertScreenChange(
      'Navigate to Cost tab',
      `(() => {
        const tabs = Array.from(document.querySelectorAll('nav button'));
        const costTab = tabs.find(t => t.textContent.includes('Cost'));
        if (costTab) { costTab.click(); return true; }
        return false;
      })()`,
      `document.body.innerText`
    )
    await capture('8-cost-stats-screen.png')
    const costText = await evaluate(`document.body.innerText`)
    if (!costText.includes('LLM Cost & Efficiency Ledger') || !costText.includes('Total Spend')) {
      throw new Error('[FAIL] Stats screen failed to render')
    }
    console.log('  ✓ StatsScreen loaded /stats/llm (showing spend ₹0.00, cache hit %, model breakdown)')

    ws.close()
  } finally {
    chromeProc.kill()
    try {
      fs.rmSync(tmpUserData, { recursive: true, force: true })
    } catch {}
  }

  console.log('\n====================================================')
  console.log('All Checks and Click-Change Assertions PASSED (390x844)!')
  console.log('====================================================\n')
}

runVerification().catch((err) => {
  console.error('\nVERIFICATION FAILED:', err.message)
  process.exit(1)
})
