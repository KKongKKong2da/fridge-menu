// check-live.mjs — Pages 활성 + 라이브 200 + v1.3 콘텐츠 확인 (GH_TOKEN 주입)
const OWNER = 'KKongKKong2da', REPO = 'fridge-menu'
const SITE = 'https://kkongkkong2da.github.io/fridge-menu/'
const GH = 'https://api.github.com'
const token = process.env.GH_TOKEN
const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'chatbox-check' }

const pages = await fetch(`${GH}/repos/${OWNER}/${REPO}/pages`, { headers })
const ptext = await pages.text()
console.log(`PAGES_HTTP ${pages.status} ${pages.status === 200 ? JSON.parse(ptext).build_type + '/' + JSON.parse(ptext).status : JSON.parse(ptext).message}`)

const site = await fetch(SITE, { redirect: 'follow' })
console.log(`SITE_HTTP ${site.status} ${site.url}`)
const html = await site.text()
const js = html.match(/assets\/(index-[A-Za-z0-9_-]+\.js)/)
const css = html.match(/assets\/(index-[A-Za-z0-9_-]+\.css)/)
console.log(`HTML js=${js && js[1]} css=${css && css[1]}`)
const jsRes = await fetch(`${SITE}assets/${js[1]}`)
const jsText = await jsRes.text()
console.log(`JS_HTTP ${jsRes.status} v3key=${jsText.includes('fridge-chips:v3')} zone5=${jsText.includes('유제품')} zone6=${jsText.includes('해산물·기타')} season=${jsText.includes('소스, 오일, 조미료 모두 보유')}`)
const cssRes = await fetch(`${SITE}assets/${css[1]}`)
const cssText = await cssRes.text()
console.log(`CSS_HTTP ${cssRes.status} grey=${cssText.includes('#6b7280')} color-mix=${cssText.includes('color-mix')} touch-action=${cssText.includes('touch-action')}`)
console.log('DONE')
