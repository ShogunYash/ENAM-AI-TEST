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
  console.log('FINN End-to-End Real Data Screen Verification Suite')
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
    const clickAndAssertScreenChange = async (
      actionDesc,
      clickExpr,
      getScreenExpr = 'document.body.innerText',
      timeoutMs = 4000
    ) => {
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
          `[FAIL] Click did NOT change the screen for action: "${actionDesc}"!\nBefore state was: ${String(
            before
          ).slice(0, 150)}...`
        )
      }

      console.log(`  ✓ Click changed screen for: ${actionDesc}`)
      return after
    }

    // Wait for initial render and data fetch
    await new Promise((r) => setTimeout(r, 1500))

    // 1. Initial Today Screen (24h)
    console.log('[Step 1] Verifying Today Screen (24h)...')
    await capture('1-today-24h.png')
    const initialText = await evaluate(`document.body.innerText`)
    if (!initialText.toUpperCase().includes('NEEDS YOU')) {
      throw new Error('[FAIL] Today screen did not load properly: ' + initialText.slice(0, 150))
    }
    // Verify LIVE mode badge from /health
    if (!initialText.includes('LIVE')) {
      throw new Error('[FAIL] Today screen did not display "LIVE" badge when /health returns mode: "live"')
    }
    if (initialText.includes('DEMO DATA')) {
      throw new Error('[FAIL] Today screen displayed "DEMO DATA" despite /health being mode: "live"')
    }
    console.log('  ✓ Today screen loaded with verified LIVE badge')

    // 2. Click Window Picker 30d -> MUST CHANGE SCREEN (Loads real 30d BSE results filings)
    console.log('\n[Step 2] Testing Window Picker click (24h -> 30d)...')
    await clickAndAssertScreenChange(
      'Switch window picker from 24h to 30d',
      `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btn30d = btns.find(b => b.textContent.trim() === '30d');
        if (btn30d) { btn30d.click(); return true; }
        return false;
      })()`,
      `document.body.innerText`
    )
    await capture('2-today-30d-results.png')
    const text30d = await evaluate(`document.body.innerText`)
    // Assert 30d window picker is selected and displays real results
    if (!text30d.includes('TATASTEEL') && !text30d.includes('TITAN') && !text30d.includes('HINDZINC')) {
      throw new Error('[FAIL] 30d digest did not display real results filings: ' + text30d.slice(0, 200))
    }
    console.log('  ✓ 30d chip clicked: rendered real 30-day filings (TATASTEEL / TITAN results)')

    // 3. Open Ask FINN on a real filing -> MUST CHANGE SCREEN (Opens sheet)
    console.log('\n[Step 3] Testing Ask FINN on real results filing...')
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
    // Assert canned fallback string is REMOVED
    if (askSheetText.includes('Key update from official exchange filing')) {
      throw new Error('[FAIL] Ask FINN sheet still contains canned fallback "Key update from official exchange filing"')
    }
    console.log('  ✓ Ask FINN sheet correctly labeled Preview')
    console.log('  ✓ "Verified quote match" badge removed from Ask FINN')
    console.log('  ✓ Canned fallback "Key update from official exchange filing" removed')

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

    // Assert visible SAMPLE DATA badge (since is_sample ?? true)
    if (!resText.includes('SAMPLE DATA')) {
      throw new Error('[FAIL] Research screen missing visible "SAMPLE DATA" badge (from is_sample ?? true)')
    }
    console.log('  ✓ Visible "SAMPLE DATA" badge confirmed on research view via is_sample ?? true')

    // Assert portfolio chips loaded from data/portfolio.json
    if (!resText.toUpperCase().includes('PORTFOLIO:') || !resText.includes('TCS') || !resText.includes('BAJFINANCE')) {
      throw new Error('[FAIL] Suggested chips were not replaced with portfolio.json stocks: ' + resText.slice(0, 150))
    }
    console.log('  ✓ Suggested chips dynamically populated from data/portfolio.json (TCS, INFY, BAJFINANCE, ...)')

    // 5. Test clicking a different portfolio stock chip (e.g. TCS) -> MUST CHANGE SCREEN
    console.log('\n[Step 5] Clicking portfolio chip TCS (testing Build Progress clean copy)...')
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
    // Verify polling copy is REMOVED
    if (tcsText.includes('every 3s') || tcsText.includes('poll 1') || tcsText.includes('poll 2')) {
      throw new Error('[FAIL] Polling copy still present in BuildProgress: ' + tcsText.slice(0, 200))
    }
    // Verify rate-limit copy is REMOVED
    if (tcsText.includes('1 req/s rate limited')) {
      throw new Error('[FAIL] Rate-limit copy still present in BuildProgress')
    }
    console.log('  ✓ Polling and rate-limit copy removed from BuildProgress')

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
    if (!citText.includes('Verified Source Citation') || !citText.includes('Page 4')) {
      throw new Error('[FAIL] Citation drawer failed to display document and page')
    }
    // Assert "Confidence: 100%" is REMOVED
    if (citText.includes('Confidence: 100%')) {
      throw new Error('[FAIL] Citation drawer still contains hard-coded "Confidence: 100%" (must be removed)')
    }
    // Assert SAMPLE DATA status carried into drawer
    if (!citText.includes('SAMPLE DATA')) {
      throw new Error('[FAIL] Citation drawer missing SAMPLE DATA indicator')
    }
    console.log('  ✓ "Confidence: 100%" successfully removed from Citation Drawer')
    console.log('  ✓ SAMPLE DATA badge carried into Citation Drawer overlay')

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
    // Verify improved helper copy
    if (!threshText.includes('≥') || !threshText.includes('daily close rises or falls')) {
      throw new Error('[FAIL] Thresholds screen missing precise helper comparator copy')
    }
    console.log('  ✓ Thresholds screen rendered with precise helper comparators')

    // Test clicking preset 3.0x -> MUST CHANGE SCREEN
    console.log('\n[Step 9] Clicking 3.0x volume preset...')
    await clickAndAssertScreenChange(
      'Click volume preset 3.0x',
      `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btn3x = btns.find(b => b.textContent.trim() === '3.0×');
        if (btn3x) { btn3x.click(); return true; }
        return false;
      })()`,
      `document.body.innerText`
    )
    const updatedThreshText = await evaluate(`document.body.innerText`)
    if (!updatedThreshText.includes('≥ 3.0×')) {
      throw new Error('[FAIL] Threshold helper did not update to 3.0x: ' + updatedThreshText.slice(0, 150))
    }
    console.log('  ✓ Clicking preset updated state and helper copy to ≥ 3.0×')

    // 10. Navigate to Cost/Stats Screen -> MUST CHANGE SCREEN (Verifying live /stats/llm)
    console.log('\n[Step 10] Navigating to Cost / Stats screen (live /stats/llm)...')
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
    // Verify LIVE mode badge on stats screen as-of chip
    if (!costText.includes('LIVE')) {
      throw new Error('[FAIL] Stats screen did not display LIVE badge')
    }
    console.log('  ✓ StatsScreen loaded live /stats/llm with LIVE provenance badge')

    ws.close()
  } finally {
    chromeProc.kill()
    try {
      fs.rmSync(tmpUserData, { recursive: true, force: true })
    } catch {}
  }

  console.log('\n====================================================')
  console.log('All Real-Data Checks & Click-Change Assertions PASSED (390x844)!')
  console.log('====================================================\n')
}

runVerification().catch((err) => {
  console.error('\nVERIFICATION FAILED:', err.message)
  process.exit(1)
})
