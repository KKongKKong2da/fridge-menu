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
let bad = 0
for (const f of files) {
  const src = readFileSync(f, 'utf8')
  const m = src.match(ARABIC)
  if (m) {
    bad++
    const ln = src.slice(0, m.index).split('\n').length
    console.log(' *깨짐*', f, 'L' + ln, '→', src.split('\n')[ln - 1].trim().slice(0, 100))
  }
}
console.log(bad === 0 ? '한글 깨짐(아랍 치환) 0건 / 대상 ' + files.length + '개 파일' : '깨진 파일 ' + bad + '개')
process.exit(bad === 0 ? 0 : 1)
