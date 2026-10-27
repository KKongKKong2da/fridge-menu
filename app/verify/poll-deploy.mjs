// poll-deploy.mjs — v1.5: Actions run 1개 감시 → success 후 라이브 3종(HTML/JS/CSS) 200 확인
// 실행: node verify/poll-deploy.mjs (GH_TOKEN 환경변수 주입 필요)
const owner = 'KKongKKong2da', repo = 'fridge-menu', sha = process.argv[2] ?? '065d200'
const token = process.env.GH_TOKEN
if (!token) { console.log('NO_TOKEN'); process.exit(1) }
const H = { headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'chatbox', Accept: 'application/vnd.github+json' } }
const base = `https://api.github.com/repos/${owner}/${repo}`

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let run = null
for (let i = 0; i < 24; i++) {
  const list = await (await fetch(`${base}/actions/runs?per_page=5`, H)).json()
  run = list.workflow_runs?.find((r) => r.head_sha.startsWith(sha))
  if (run && run.status === 'completed') break
  await sleep(10000)
}
if (!run) { console.log('NO_RUN_FOUND for sha', sha); process.exit(1) }
console.log(`run #${run.run_number} [${run.name}] status=${run.status} conclusion=${run.conclusion}`)
if (run.conclusion !== 'success') { console.log('ACTIONS-FAIL'); process.exit(1) }

const site = `https://${owner.toLowerCase()}.github.io/fridge-menu`
const urls = [site + '/', site + '/index.html']
// 번들 해시 파싱 (index.html에서 assets/*.js, *.css)
const html = await (await fetch(site + '/?cachebust=' + Date.now(), { headers: { 'Cache-Control': 'no-cache' } })).text()
const js = html.match(/assets\/index-[A-Za-z0-9_-]+\.js/)?.[0]
const css = html.match(/assets\/index-[A-Za-z0-9_-]+\.css/)?.[0]
if (js) urls.push(`${site}/${js}`)
if (css) urls.push(`${site}/${css}`)
let allOk = true
for (const u of urls) {
  const res = await fetch(u + (u.includes('?') ? '&' : '?') + 'cb=' + Date.now())
  const body = res.ok ? await res.text() : ''
  const flag = u.endsWith('.css') ? (body.includes('44px') ? ' [44px fold-btn OK]' : ' [44px MISSING]') :
    u.endsWith('.js') ? (body.includes('1500') ? ' [1500ms sensor OK]' : ' [1500ms MISSING]') : ''
  if (!res.ok) allOk = false
  console.log(`${res.status} ${u.replace(site, '.')}${flag}`)
}
console.log(allOk ? 'LIVE-200 ALL PASS' : 'LIVE-200 FAIL')
process.exit(allOk ? 0 : 1)
