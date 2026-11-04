// v162-logic-test.mjs — v1.6.2 프롬프트 검증 (실행: node verify/v162-logic-test.mjs, exit 0 = ALL PASS)
// 목적: 빨강(임박)이 "꼭 사용해야 하는 재료"로 프롬프트에 명시되는지,
//       파랑/빨강이 중복 없이 각자의 줄로 분리되는지, 회색이 빠지는지, 유지 규칙이 그대로인지.
import { readFileSync as read } from 'node:fs'
import {
  buildLines, buildPrompt, buildGoogleUrl, selectedNames,
  PROMPT_EMPTY_MSG, BULLET,
} from '../src/lib/prompt.js'

let pass = 0, fail = 0
const ok = (cond, label) => {
  if (cond) { pass++; console.log(' PASS', label) }
  else { fail++; console.log(' *FAIL*', label) }
}
const stripC = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')

// 픽스처: 화면(저장) 순서 = A1(파랑) R1(빨강) B2(파랑) R2(빨강) G(회색)
const chips = [
  { name: 'A1', zone: 1, state: 1, custom: false },
  { name: 'R1', zone: 1, state: 2, custom: false },
  { name: 'B2', zone: 2, state: 1, custom: false },
  { name: 'R2', zone: 3, state: 2, custom: false },
  { name: 'G', zone: 4, state: 0, custom: false },
]

console.log('--- 1. 임박(빨강) 필수 사용 명시 ---')
{
  const lines = buildLines(chips, [])
  ok(lines[0].startsWith('반드시 사용해야 하는 임박 재료: R1, R2'), '1줄 = 임박 재료 명시 (빨강만, 화면 순서)')
  ok(lines[1] === '위의 임박 재료를 꼭 쓰고, 아래 재료들 일부로 만들 수 있는 레시피를 추천해줘: A1, B2',
    '2줄 = 임박을 꼭 쓰고 + 파랑 나열 (파랑만, 화면 순서)')
  ok(lines[2] === '소스, 오일, 조미료, 장류 모두 보유', '3줄 = 조미료 상시 (1.6 유지)')
  ok(lines.length === 3, '종류 미선택 → 3줄')
}

console.log('--- 2. 중복·회색 제외 ---')
{
  const lines = buildLines(chips, [])
  const all = lines.join(' ')
  ok(!all.includes('G'), '회색 칩 = 어느 줄에도 없음')
  ok(lines[0].split(',').filter((t) => t.includes('A1') || t.includes('B2')).length === 0, '1줄(임박)에 파랑 혼입 없음')
  ok(lines[1].split(',').filter((t) => t.includes('R1') || t.includes('R2')).length === 0, '2줄(파랑)에 빨강 중복 나열 없음')
}

console.log('--- 3. 색 유무 조합 ---')
{
  const redOnly = buildLines([{ name: 'R', zone: 1, state: 2, custom: false }], [])
  ok(redOnly.length === 3 && redOnly[0] === '반드시 사용해야 하는 임박 재료: R' && redOnly[1] === '위의 임박 재료만으로 만들 수 있는 레시피를 추천해줘' && redOnly[2] === '소스, 오일, 조미료, 장류 모두 보유',
    '빨강만: 3줄 (임박 나열 + "임박 재료만으로" + 조미료 상시)')
  const blueOnly = buildLines([{ name: 'B', zone: 1, state: 1, custom: false }], [])
  ok(blueOnly.length === 2 && blueOnly[0] === '다음의 냉장고 속 재료들 일부로 만들 수 있는 레시피를 추천해줘: B',
    '빨강 없음: 1.6 문구 그대로 (파랑 한 줄) → 임박 줄 생략')
  ok(buildLines([{ name: 'X', zone: 1, state: 0, custom: false }], []) === null, '회색만 = null (빈 메시지 경로)')
  ok(PROMPT_EMPTY_MSG.length > 0, '빈 메시지 문구 존재')
}

console.log('--- 4. 종류(선택 시) 마지막 줄 ---')
{
  const lines = buildLines(chips, ['한식', '파스타'])
  ok(lines.at(-1) === '종류: 한식, 파스타', '종류 선택 시 마지막 줄 (기타 순서 유지)')
  ok(lines.length === 4, '빨강O 파랑O + 종류 = 4줄')
  ok(buildLines([{ name: 'B', zone: 1, state: 1, custom: false }], ['한식']).at(-1) === '종류: 한식', '빨강 없음 + 종류 = 마지막 줄')
}

console.log('--- 5. 전문(복사·Google 단일 소스) ---')
{
  const p = buildPrompt(chips, [])
  const lines = p.split('\n')
  ok(lines.length === 3 && lines.every((l) => l.startsWith('· ')), '전문 = 줄마다 · + 줄바꿈 (복사 원문)')
  ok(lines[0] === `${BULLET}반드시 사용해야 하는 임박 재료: R1, R2`, '전문 1줄 = 임박 명시 (복사에도 그대로)')
  const url = buildGoogleUrl(p)
  ok(url.startsWith('https://www.google.com/search?q=') && url.includes(encodeURIComponent('임박 재료')),
    'Google = 전문 전체 인코딩 (임박 명시 포함)')
  ok(selectedNames(chips).join(',') === 'A1,R1,B2,R2', '빈 메시지 판정 = 파랑+빨강 (회색 제외)')
}

console.log('--- 6. 소스 정적 확인 (오타·유지) ---')
{
  const src = stripC(read('src/lib/prompt.js', 'utf8'))
  ok(src.includes("'반드시 사용해야 하는 임박 재료: '"), '임박 리드 문구 정의')
  ok(src.includes("'소스, 오일, 조미료, 장류 모두 보유'"), '조미료 상시 문구 유지 (1.6 검증 기준)')
  ok(src.includes('c.state === 2'), '빨강 = state 2 분리')
  ok(src.includes('c.state === 1'), '파랑 = state 1 분리')
  ok(!src.includes('var '), 'var 금지 (const/let)')
  const rc = stripC(read('src/components/ResultCard.jsx', 'utf8'))
  ok(rc.includes("split('\\n')"), 'ResultCard는 줄마다 <p> 렌더 (줄 수 증가에도 안전)')
  ok(!rc.includes('(3줄)'), 'ResultCard 라벨의 "3줄" 고정 표기 제거 (줄 수 변동 대응)')
  const app = stripC(read('src/App.jsx', 'utf8'))
  ok(app.includes('buildPrompt(chips, kinds)'), 'App → buildPrompt 연결 (신호 변화 없음)')
  ok(/v1\.6\.[23]/.test(app), 'footer 표기 v1.6.2/v1.6.3')
}

console.log(`\n합계 PASS=${pass} FAIL=${fail}`)
process.exit(fail === 0 ? 0 : 1)
