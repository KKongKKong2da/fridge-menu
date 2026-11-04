// verify/var-scan.mjs — v1.3 명세 9절 전수 검사 (var 0건 / 이름 충돌 / window 남용)
// 실행: node verify/var-scan.mjs
// 검사 대상: app/src 아래 .js/.jsx (var·window), 파일 간 export 이름 중복,
//            그리고 v13-logic-test.mjs가 정적 확인에 쓸 파일 텍스트 제공.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const SRC = join(import.meta.dirname, '..', 'app', 'src')

const JS_EXT = /\.(js|jsx)$/
const ALL_TEXT = new Map() // 파일명 → 전문 (정적 확인용, css 포함)

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else out.push(full)
  }
  return out
}

export function scanSource(srcRoot = SRC) {
  const files = walk(srcRoot).filter((f) => JS_EXT.test(f))
  const css = walk(srcRoot).filter((f) => /\.css$/.test(f))
  for (const f of [...files, ...css]) ALL_TEXT.set(f.split(/[\\/]/).pop(), readFileSync(f, 'utf8'))

  // ① var 잔존 (주석·문자열 제거 후 코드 토큰만 검사)
  let varCount = 0
  const varDetail = []
  for (const f of files) {
    const code = stripCommentsAndStrings(readFileSync(f, 'utf8'))
    const hits = code.match(/\bvar\s+[A-Za-z_$]/g) || []
    if (hits.length) {
      varCount += hits.length
      varDetail.push(`${f.split(/[\\/]/).pop()}: ${hits.length}건`)
    }
  }

  // ② window 전역 남용 (navigator.clipboard 폴백만 허용 → window. 참조 0건 기대)
  const windowHits = []
  for (const f of files) {
    const code = stripCommentsAndStrings(readFileSync(f, 'utf8'))
    const hits = code.match(/\bwindow\s*\./g) || []
    if (hits.length) windowHits.push(`${f.split(/[\\/]/).pop()}: ${hits.length}건`)
  }

  // ③ 파일 간 export 이름 중복 (모듈간 단일 정의)
  const owner = new Map()
  const dupeExports = []
  for (const f of files) {
    const name = f.split(/[\\/]/).pop()
    const code = stripCommentsAndStrings(readFileSync(f, 'utf8'))
    for (const sym of exportedSymbols(code)) {
      if (owner.has(sym)) dupeExports.push(`${sym}: ${owner.get(sym)} / ${name}`)
      else owner.set(sym, name)
    }
  }

  // ④ const/let 사용 분포 (리포트)
  let constCount = 0
  let letCount = 0
  for (const f of files) {
    const code = stripCommentsAndStrings(readFileSync(f, 'utf8'))
    constCount += (code.match(/\bconst\s+[A-Za-z_$([]/g) || []).length
    letCount += (code.match(/\blet\s+[A-Za-z_$]/g) || []).length
  }

  return {
    fileCount: files.length,
    varCount,
    varDetail,
    windowHits,
    dupeExports,
    constCount,
    letCount,
    textOf: (name) => ALL_TEXT.get(name) ?? '',
    // 주석·문자열 제거 후 코드 토큰만 (주석 속 언급어에 걸리지 않는 정적 검사용)
    codeOf: (name) => {
      const src = ALL_TEXT.get(name)
      return src === undefined ? '' : stripCommentsAndStrings(src)
    },
  }
}

// export const/function NAME, export { a, b } (default는 제외)
function exportedSymbols(code) {
  const syms = []
  for (const m of code.matchAll(/\bexport\s+(?:const|let|function)\s+([A-Za-z_$][\w$]*)/g)) syms.push(m[1])
  for (const m of code.matchAll(/\bexport\s*\{([^}]*)\}/g)) {
    for (const part of m[1].split(',')) {
      const name = part.split(/\sas\s/).pop().trim()
      if (name && name !== 'default') syms.push(name)
    }
  }
  return syms
}

// 주석(//, /* */)과 문자열/템플릿 리터럴을 지워 검사 위양성 제거
function stripCommentsAndStrings(src) {
  let out = ''
  let i = 0
  const n = src.length
  while (i < n) {
    const c = src[i]
    const two = src.slice(i, i + 2)
    if (two === '//') {
      while (i < n && src[i] !== '\n') i += 1
      continue
    }
    if (two === '/*') {
      i += 2
      while (i < n && src.slice(i, i + 2) !== '*/') i += 1
      i += 2
      continue
    }
    if (c === '"' || c === "'" || c === '`') {
      i += 1
      while (i < n) {
        if (src[i] === '\\') {
          i += 2
          continue
        }
        if (src[i] === c) {
          i += 1
          break
        }
        i += 1
      }
      out += ' ' // 리터럴 자리 보전 (인접 토큰 합쳐짐 방지)
      continue
    }
    out += c
    i += 1
  }
  return out
}

// CLI 실행 시 표 출력
const cliFile = process.argv[1] ? process.argv[1].split(/[\\/]/).pop() : ''
if (cliFile === 'var-scan.mjs') {
  const report = scanSource()
  console.log('| 항목 | 결과 |')
  console.log('|---|---|')
  console.log(`| 대상 js/jsx 파일 수 | ${report.fileCount} |`)
  console.log(`| var 잔존 | ${report.varCount}건 ${report.varDetail.length ? '(' + report.varDetail.join(', ') + ')' : ''} |`)
  console.log(`| const 선언 | ${report.constCount} |`)
  console.log(`| let 선언 | ${report.letCount} |`)
  console.log(`| window. 남용 | ${report.windowHits.length ? report.windowHits.join(', ') : '0건'} |`)
  console.log(`| export 이름 파일 간 중복 | ${report.dupeExports.length ? report.dupeExports.join(' / ') : '없음'} |`)
  process.exit(report.varCount === 0 && report.windowHits.length === 0 && report.dupeExports.length === 0 ? 0 : 1)
}
