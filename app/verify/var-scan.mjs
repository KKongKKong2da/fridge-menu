// var-scan.mjs — v1.5 전수검사 (실행: node verify/var-scan.mjs, exit 0 = PASS)
// 규칙: ① var 금지(const/let만) ② window. 접두사 금지 ③ export 이름 중복 금지
//       ④ 신규 라이브러리 금지 — import 대상은 package.json의 dependencies에 있는 것만 허용
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const SRC = 'src'
const files = []
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p)
    else if (p.endsWith('.js') || p.endsWith('.jsx')) files.push(p)
  }
}
walk(SRC)

const deps = Object.keys(JSON.parse(readFileSync('package.json', 'utf8')).dependencies ?? {})
const allowed = new Set(deps)
const problems = []
const exportNames = new Map() // name -> 파일 목록

const strip = (code) =>
  code
    .replace(/\/\*[\s\S]*?\*\//g, '') // 블록 주석
    .replace(/\/\/[^\n]*/g, '') // 라인 주석 (주석 내 var·window·import 무시인 처리)

for (const f of files) {
  const raw = readFileSync(f, 'utf8')
  if (/[\u0600-\u06FF\u0700-\u074F]/.test(raw)) problems.push(`${f}: 아랍 스크립트 문자 검출 (저장 깨짐 의심)`)
  const code = strip(raw)
  const varHits = code.match(/\bvar\s+[A-Za-z_$]/g)
  if (varHits) problems.push(`${f}: var 사용 ${varHits.length}건 → const/let로 교체 필요`)
  const winHits = code.match(/\bwindow\./g)
  if (winHits) problems.push(`${f}: window. 사용 ${winHits.length}건 → 전역 직접 참조 금지`)
  for (const m of code.matchAll(/import\s+[^'"]*from\s+['"]([^'"]+)['"]/g)) {
    const mod = m[1]
    if (mod.startsWith('.') || mod.startsWith('/')) continue // 상대 경로는 라이브러리 아님
    const pkg = mod.startsWith('@') ? mod.split('/').slice(0, 2).join('/') : mod.split('/')[0]
    if (!allowed.has(pkg)) problems.push(`${f}: 신규 라이브러리 import 금지 (${mod}) — package.json deps: ${[...allowed].join(', ')}`)
  }
  for (const m of code.matchAll(/export\s+(?:const|function|class)\s+([A-Za-z0-9_$]+)/g)) {
    const list = exportNames.get(m[1]) ?? []
    list.push(f)
    exportNames.set(m[1], list)
  }
}

for (const [name, list] of exportNames) if (list.length > 1) problems.push(`export 중복: ${name} (${list.join(', ')})`)

console.log(`검사 파일 ${files.length}개 | deps ${deps.length}종 (${deps.join(', ')})`)
if (problems.length === 0) {
  console.log('VAR-SCAN PASS: var 0건 · window. 0건 · export 중복 0건 · 신규 라이브러리 0건 · 한글 저장 정상을 확인')
  process.exit(0)
}
console.log('VAR-SCAN FAIL:')
for (const p of problems) console.log(' -', p)
process.exit(1)
