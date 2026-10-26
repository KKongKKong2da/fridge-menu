// M3 빌드 이전 정적 검증: 상대 import 그래프 + named/default export 존재 확인
// 실행: node verify\import-check.mjs  (fridge-menu 폴더에서, npm install 불필요)
// 규칙:
//  - from import는 `import`~`from 'path'` 덩어리째 파싱 (lazy + 첫 from에서 정지 -> 다중 import 흡수 방지)
//  - 사이드이펙트 import(import 'x.css')는 파일 존재만 검사
//  - named import는 대상 파일의 export 목록과 대조, default import는 default export 필수
import { readFileSync, existsSync } from 'node:fs'

const APP = 'app/src'
const FILES = [
  `${APP}/main.jsx`,
  `${APP}/App.jsx`,
  `${APP}/hooks/useFridge.js`,
  `${APP}/lib/storage.js`,
  `${APP}/data/materials.js`,
  `${APP}/components/ZoneList.jsx`,
  `${APP}/components/Chip.jsx`,
  `${APP}/components/RecentBar.jsx`,
  `${APP}/components/ResultCard.jsx`,
  `${APP}/lib/prompt.js`,
]

const results = []
const record = (file, pass, detail) => results.push({ file, pass, detail })

const exportsOf = (src) => {
  const names = new Set()
  if (/export\s+default\s+/.test(src)) names.add('default')
  for (const m of src.matchAll(/export\s+(?:async\s+)?(?:function|class)\s+([A-Za-z0-9_$]+)/g)) names.add(m[1])
  for (const m of src.matchAll(/export\s+(?:const|let|var)\s+([A-Za-z0-9_$]+)/g)) names.add(m[1])
  for (const m of src.matchAll(/export\s*\{([^}]*)\}/gs)) {
    m[1].split(',').forEach((t) => {
      const parts = t.trim().split(/\s+as\s+/)
      const name = (parts[1] || parts[0] || '').trim()
      if (name) names.add(name)
    })
  }
  return names
}

// from import 문 (다중 줄 포함): `import <절> from <경로>`
const FROM_RE = /import\s+([\s\S]*?)\s*from\s*['"]([^'"]+)['"]/g
// 사이드이펙트 import: import 'x' (from 없음)
const BARE_RE = /import\s*['"](\.[^'"]+)['"]/g

let allPass = true
for (const file of FILES) {
  const src = readFileSync(file, 'utf8')
  const problems = []
  let matched = 0
  const dir = file.slice(0, file.lastIndexOf('/'))

  let m
  FROM_RE.lastIndex = 0
  while ((m = FROM_RE.exec(src)) !== null) {
    matched++
    const clause = m[1].trim()
    const rel = m[2]
    if (!rel.startsWith('.')) continue // 외부 패키지(@dnd-kit/react)는 검사 대상 아님
    const target = /\.(js|jsx)$/.test(rel) ? rel : `${rel}.jsx`
    const abs = `${dir}/${target}`
    if (!existsSync(abs)) { problems.push(`파일 없음: ${target}`); continue }
    const exp = exportsOf(readFileSync(abs, 'utf8'))

    const namedBlock = clause.match(/\{([\s\S]*)\}/)
    const defaultPart = clause.replace(/\{[\s\S]*\}/, '').replace(/,\s*$/, '').trim()
    if (defaultPart && !exp.has('default')) problems.push(`${target}에 default export 없음 (${defaultPart})`)
    if (namedBlock) {
      for (const raw of namedBlock[1].split(',')) {
        const name = raw.split(/\s+as\s+/)[0].trim()
        if (name && !exp.has(name)) problems.push(`${target}에 export '${name}' 없음`)
      }
    }
  }

  BARE_RE.lastIndex = 0
  while ((m = BARE_RE.exec(src)) !== null) {
    matched++
    const abs = `${dir}/${m[1]}`
    if (!existsSync(abs)) problems.push(`파일 없음: ${m[1]}`)
  }

  const importLineCount = (src.match(/^import\s/gm) || []).length
  if (importLineCount > matched) problems.push(`import 줄 ${importLineCount}개 vs 해석 ${matched}건 (사각지대)`)

  const pass = problems.length === 0
  allPass = allPass && pass
  record(file, pass, pass ? `상대 import 해석 ${matched}건 OK` : problems.join(' / '))
}

console.log('| 파일 | 판정 | 근거 |')
console.log('|------|------|------|')
for (const r of results) console.log(`| ${r.file} | ${r.pass ? 'PASS' : 'FAIL'} | ${r.detail} |`)
console.log(allPass ? 'IMPORT ALL PASS' : 'IMPORT SOME FAIL')
