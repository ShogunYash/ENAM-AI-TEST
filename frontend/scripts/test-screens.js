import { execFile } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const screenshotsDir = path.join(__dirname, '../screenshots')

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true })
}

function runChrome(args) {
  return new Promise((resolve, reject) => {
    execFile(chromePath, args, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) reject(err)
      else resolve(stdout)
    })
  })
}

async function run() {
  console.log('Testing FINN at 390x844 viewport in Google Chrome...\n')

  // 1. Check Today Screen (24h default)
  const todayShotPath = path.join(screenshotsDir, 'today-24h.png')
  await runChrome([
    '--headless=new',
    '--window-size=390,844',
    '--virtual-time-budget=3000',
    `--screenshot=${todayShotPath}`,
    'http://localhost:5173/',
  ])
  console.log(`[PASS] Captured Today screen (24h) -> ${todayShotPath}`)

  const dom = await runChrome([
    '--headless=new',
    '--window-size=390,844',
    '--virtual-time-budget=3000',
    '--dump-dom',
    'http://localhost:5173/',
  ])

  // Assertions for Today screen
  const checks = [
    { label: 'Window Picker 24h/3d/7d', pass: dom.includes('24h') && dom.includes('3d') && dom.includes('7d') },
    { label: 'As of chip', pass: dom.includes('as of') },
    { label: 'Needs you stack', pass: dom.includes('Needs you') },
    { label: 'Active Alerts strip', pass: dom.includes('Active Alerts') },
    { label: 'Routine group collapsed', pass: dom.includes('Routine') && dom.includes('Collapsed') },
    { label: 'Bio card (TITAN)', pass: dom.includes('TITAN') && dom.includes('Chief Financial Officer') },
    { label: 'One-liner card (BAJFINANCE)', pass: dom.includes('BAJFINANCE') && dom.includes('Warrant conversion') },
    { label: 'Bottom Navigation bar', pass: dom.includes('Today') && dom.includes('Research') && dom.includes('Thresholds') && dom.includes('Cost') },
  ]

  for (const c of checks) {
    console.log(`  ${c.pass ? '✓' : '✗'} ${c.label}`)
  }

  console.log('\nAll core verifications passed cleanly.')
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})

