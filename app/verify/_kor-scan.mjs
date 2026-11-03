// _kor-scan.mjs — mcp write_file 한글 저장 시 아랍 문자 치환 깨짐 스캔 (규칙: 저장 후 필수)
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const targets = ['src', 'verify']
const files = []
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p)
    else if (/\.(js|jsx|css|mjs)$/.test(p)) files.push(p)
  }
}
for (const t of targets) walk(t)

const ARABIC = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/
// NUL(0x00)·제어문자: 파일이 깨지면 git이 binary로 취급하고 읽는 도구가 파일을 끊어 버린다
// (v1.6.1의 App.jsx에서 헤더 주석 한글 2자가 NUL로 변해 실측 발생 → v1.6.3부터 함께 검사)
const CTRL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/
let bad = 0
for (const f of files) {
  const src = readFileSync(f, 'utf8')
  const m = src.match(ARABIC)
  if (m) {
    bad++
    const ln = src.slice(0, m.index).split('\n').length
    console.log(' *아랍 치환*', f, 'L' + ln, '→', src.split('\n')[ln - 1].trim().slice(0, 100))
  }
  const c = src.match(CTRL)
  if (c) {
    bad++
    const ln = src.slice(0, c.index).split('\n').length
    console.log(' *제어문자(NUL 등)*', f, 'L' + ln, ' code=' + src.charCodeAt(c.index), '→', src.split('\n')[ln - 1].trim().slice(0, 100))
  }
}
console.log(bad === 0
  ? '한글 깨짐(아랍 치환) + NUL·제어문자 0건 / 대상 ' + files.length + '개 파일'
  : '깨진 파일 ' + bad + '건')
process.exit(bad === 0 ? 0 : 1)
