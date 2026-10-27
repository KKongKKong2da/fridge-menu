// poll-deploy.mjs — Actions run 폴링 + Pages 라이브 확인 (토큰은 GH_TOKEN 환경변수로만 주입, 출력 금지)
const OWNER = 'KKongKKong2da'
const REPO = 'fridge-menu'
const SHA = '5e05f61313bb14a511fb23e79d473d9b59c60876'
const SITE = 'https://kkongkkong2da.github.io/fridge-menu/'
const GH = 'https://api.github.com'

const token = process.env.GH_TOKEN
if (!token) { console.log('NO_TOKEN'); process.exit(2) }

const headers = {
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'chatbox-deploy-poll',
}

const get = async (url) => {
  const res = await fetch(url, { headers })
  const text = await res.text()
  let data = null
  try { data = JSON.parse(text) } catch {}
  return { status: res.status, data, text }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let run = null
for (let i = 0; i < 24; i++) {
  const { status, data } = await get(`${GH}/repos/${OWNER}/${REPO}/actions/runs?branch=main&per_page=5`)
  if (status !== 200) { console.log(`RUNS_HTTP ${status} ${(data && data.message) || ''}`); process.exit(3) }
  const runs = (data.workflow_runs || []).filter((r) => r.head_sha.startsWith(SHA.slice(0, 7)))
  run = runs[0]
  if (run) break
  await sleep(6000)
}

if (!run) { console.log('NO_RUN_FOUND'); process.exit(4) }
console.log(`run id=${run.id} name=${run.name} status=${run.status}`)

let conclusion = null
for (let i = 0; i < 30; i++) {
  const { data } = await get(`${GH}/repos/${OWNER}/${REPO}/actions/runs/${run.id}`)
  const r = data && data.run
  if (r) {
    console.log(`  poll${i} status=${r.status} conclusion=${r.conclusion}`)
    if (r.status === 'completed') { conclusion = r.conclusion; break }
  }
  await sleep(7000)
}
console.log(`CONCLUSION ${conclusion}`)
if (conclusion !== 'success') {
  const jobs = await get(`${GH}/repos/${OWNER}/${REPO}/actions/runs/${run.id}/jobs`)
  for (const j of (jobs.data && jobs.data.jobs) || []) {
    console.log(`  job ${j.name}: ${j.status}/${j.conclusion}`)
  }
  process.exit(5)
}

// Pages 상태 + 라이브 확인
const pages = await get(`${GH}/repos/${OWNER}/${REPO}/pages`)
console.log(`PAGES_HTTP ${pages.status} ${pages.status === 200 ? (pages.data.build_type || '') + ' ' + (pages.data.status || '') : (pages.data && pages.data.message) || ''}`)

const site = await fetch(SITE, { redirect: 'follow' })
console.log(`SITE_HTTP ${site.status} ${site.url}`)
const html = await site.text()
const jsMatch = html.match(/assets\/(index-[A-Za-z0-9_-]+\.js)/)
const cssMatch = html.match(/assets\/(index-[A-Za-z0-9_-]+\.css)/)
console.log(`HTML has js=${!!jsMatch} css=${!!cssMatch} jsFile=${jsMatch && jsMatch[1]} cssFile=${cssMatch && cssMatch[1]}`)
if (jsMatch) {
  const js = await fetch(`${SITE}assets/${jsMatch[1]}`)
  console.log(`JS_HTTP ${js.status}`)
  const jsText = await js.text()
  console.log(`JS markers: v3key=${jsText.includes('fridge-chips:v3')} zone5=${jsText.includes('유제품')} zone6=${jsText.includes('해산물·기타')} prompt=${jsText.includes('소스, 오일, 조미료 모두 보유')}`)
}
if (cssMatch) {
  const css = await fetch(`${SITE}assets/${cssMatch[1]}`)
  const cssText = await css.text()
  console.log(`CSS_HTTP ${css.status} grey=${cssText.includes('#6b7280')} color-mix=${cssText.includes('color-mix')} touch-action=${cssText.includes('touch-action')}`)
}
console.log('DONE')
