// ============================================================
// verify/v12-logic-test.mjs — v1.2 검증 케이스 20건 (node 로직 시뮬)
// 실행: node verify/v12-logic-test.mjs   (fridge-menu 폴더에서)
// React/DOM 없이 순수 저장·프롬프트 로직(app/src/lib/storage.js, prompt.js)만 검증.
// localStorage는 가짜 객체로 시뮬레이션한다. (기존 m1/m2/m4 테스트와 같은 방식)
// ============================================================
import { readFileSync } from 'node:fs'

// ---- localStorage 시뮬 (storage.js는 함수 호출 시점에만 localStorage를 사용) ----
const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
}

const {
  STORAGE_KEY,
  loadState,
  persist,
  cycleChipState,
  setAllState,
  removeChipState,
  addChipState,
} = await import('../app/src/lib/storage.js')
const { buildLines, buildPrompt, buildGoogleUrl, PROMPT_EMPTY_MSG, SEASONING_LINE } = await import(
  '../app/src/lib/prompt.js'
)
const { DEFAULT_COUNT } = await import('../app/src/data/materials.js')

let pass = 0
let fail = 0
const results = []
function check(id, name, ok, detail = '') {
  results.push({ id, name, ok, detail })
  if (ok) pass++
  else fail++
}
const names = (st) => st.chips.map((c) => c.name)
// 달걀을 뺀 zone1 원본 순서 (materials.js zone1 순서) — 케이스 3 비교용
const zone1RestOrder = () =>
  ['우삼겹', '갈비살', '스테이크', '불고기', '삼겹살', '대패삼겹살', '닭다리살', '훈제오리', '베이컨', '소시지'].join()

// ============ 1. 첫 실행 = 39종 전부 파랑, 4 기타 조 빈 조 ============
{
  store.clear()
  const st = loadState()
  const zone4Count = st.chips.filter((c) => c.zone === 4).length
  const ok = st.chips.length === DEFAULT_COUNT && DEFAULT_COUNT === 38 && st.chips.every((c) => c.state === 1) && zone4Count === 0
  check('01', '첫 실행 39종 파랑 / 기타 빈 조', ok, `칩 ${st.chips.length}종, zone4 ${zone4Count}개`)
}

// ============ 2. 클릭 3회: 파랑→빨강→검정→파랑 ============
{
  store.clear()
  let st = loadState()
  const target = '우삼겹'
  st = cycleChipState(st, target)
  const c1 = st.chips.find((c) => c.name === target).state
  st = cycleChipState(st, target)
  const c2 = st.chips.find((c) => c.name === target).state
  st = cycleChipState(st, target)
  const c3 = st.chips.find((c) => c.name === target).state
  check('02', '클릭 3회 사이클 1→2→0→1', c1 === 2 && c2 === 0 && c3 === 1, `state ${c1}/${c2}/${c3}`)
}

// ============ 3. 빨강 이동: 그 조 최선두, 그 조 파랑은 뒤로 밀림 ============
{
  store.clear()
  let st = loadState()
  st = cycleChipState(st, '달걀') // zone1 파랑 → 빨강
  const zone1 = st.chips.filter((c) => c.zone === 1).map((c) => c.name)
  const ok = zone1[0] === '달걀' && zone1.slice(1).join() === zone1RestOrder()
  check('03', '빨강 → 그 조 최선두 (파랑 밀림)', ok, `zone1: ${zone1.join(',')}`)
}

// ============ 4. 검정 이동: 그 조 최후미 ============
{
  store.clear()
  let st = loadState()
  st = cycleChipState(st, '우삼겹') // 파랑→빨강 (최선두)
  st = cycleChipState(st, '우삼겹') // 빨강→검정 (최후미)
  const zone1 = st.chips.filter((c) => c.zone === 1).map((c) => c.name)
  const ok = zone1[zone1.length - 1] === '우삼겹' && zone1[0] === '갈비살'
  check('04', '검정 → 그 조 최후미', ok, `zone1: ${zone1.join(',')}`)
}

// ============ 5. 파랑 복귀: 위치 그대로 (재이동 없음) ============
{
  store.clear()
  let st = loadState()
  st = cycleChipState(st, '우삼겹') // 빨강(최선두)
  st = cycleChipState(st, '우삼겹') // 검정(최후미)
  const afterOff = st.chips.filter((c) => c.zone === 1).map((c) => c.name).join()
  st = cycleChipState(st, '우삼겹') // 검정→파랑 = 위치 그대로
  const afterBlue = st.chips.filter((c) => c.zone === 1).map((c) => c.name).join()
  check('05', '파랑 복귀 = 위치 그대로', afterOff === afterBlue, `검정 후 ${afterOff} / 파랑 후 ${afterBlue}`)
}

// ============ 6. 모두 선택: 빨강 포함 전부 파랑, 순서 그대로 ============
{
  store.clear()
  let st = loadState()
  st = cycleChipState(st, '달걀') // 빨강
  st = cycleChipState(st, '삼겹살') // 빨강
  st = cycleChipState(st, '훈제오리')
  st = cycleChipState(st, '훈제오리') // 빨강→검정
  const orderBefore = names(st).join()
  st = setAllState(st, 1)
  const ok = st.chips.every((c) => c.state === 1) && names(st).join() === orderBefore
  check('06', '모두 선택 = 전부 1 + 순서 유지', ok)
}

// ============ 7. 모두 해제: 빨강 포함 전부 검정, 순서 그대로 ============
{
  store.clear()
  let st = loadState()
  st = cycleChipState(st, '달걀') // 빨강
  const orderBefore = names(st).join()
  st = setAllState(st, 0)
  const ok = st.chips.every((c) => c.state === 0) && names(st).join() === orderBefore
  check('07', '모두 해제 = 전부 0 + 순서 유지', ok)
}

// ============ 8. 조 끝 + 추가: Enter로 그 조에 파랑 칩 / 기타 조(4) 동일 ============
{
  store.clear()
  let st = loadState()
  const r1 = addChipState(st, '라면', 4)
  st = r1.state
  const r2 = addChipState(st, '우유', 4)
  st = r2.state
  const r3 = addChipState(st, '불고기소스', 3)
  st = r3.state
  const zone4 = st.chips.filter((c) => c.zone === 4).map((c) => c.name)
  const ok =
    r1.result === 'added' &&
    zone4[0] === '라면' &&
    zone4[1] === '우유' &&
    st.chips.find((c) => c.name === '라면').state === 1 &&
    st.chips.find((c) => c.name === '라면').custom === true &&
    r3.result === 'added' &&
    st.chips.find((c) => c.name === '불고기소스').zone === 3
  check('08', '조 끝 + = 파랑 칩 (기타 조 4 포함)', ok, `zone4: ${zone4.join(',')}`)
}

// ============ 9. 같은 이름: 중복 방지 + 삭제 기본 재료 재추가 시 원조 복원 ============
{
  store.clear()
  let st = loadState()
  const dup1 = addChipState(st, '달걀', 1) // 기본 재료 중복
  const noNew1 = dup1.result === 'duplicate' && dup1.state.chips.filter((c) => c.name === '달걀').length === 1
  st = addChipState(st, '라면', 4).state
  const dup2 = addChipState(st, '라면', 2) // 사용자 재료도 조 무관 중복 방지
  const noNew2 = dup2.result === 'duplicate' && dup2.state.chips.length === st.chips.length
  st = removeChipState(st, '우삼겹') // 삭제된 기본 재료 (removeChipState는 {chips} 반환)
  const re = addChipState(st, '우삼겹', 4) // 기타 조에 타이핑 → 원래 조(1)로 복원
  const backToZone1 = re.result === 'added' && re.state.chips.find((c) => c.name === '우삼겹').zone === 1
  check('09', '중복 방지 + 기본 재료 재추가(원 조)', noNew1 && noNew2 && backToZone1)
}

// ============ 10. x 삭제: 화면·localStorage 제거, 새로고침 후에도 그대로 ============
{
  store.clear()
  let st = loadState()
  st = persist(removeChipState(st, '훈제오리'))
  const gone = !st.chips.some((c) => c.name === '훈제오리')
  const restored = loadState() // 새로고침 시뮬
  const stayed = !restored.chips.some((c) => c.name === '훈제오리')
  const count = restored.chips.length === DEFAULT_COUNT - 1
  check('10', 'x 삭제 → 저장/복원 후 유지', gone && stayed && count, `삭제 후 칩 ${restored.chips.length}종`)
}

// ============ 11. 검정만 있을 때: "쓸 재료를 파랑/빨강으로 표시해주세요" ============
{
  const chips = [{ name: '달걀', zone: 1, state: 0, custom: false }]
  const p = buildPrompt(chips, [])
  const lines = buildLines(chips, [])
  check('11', '검정만 → 빈 메시지(null)', p === null && lines === null && PROMPT_EMPTY_MSG.includes('표시해주세요'))
}

// ============ 12. 프롬프트 나열: 조 1→4, 조 안 왼쪽→오른쪽 / 파랑+빨강만 / 검정 제외 ============
{
  const chips = [
    { name: '삼겹살', zone: 1, state: 2, custom: false }, // 빨강 선두 규칙이 반영된 배열
    { name: '달걀', zone: 1, state: 1, custom: false },
    { name: '훈제오리', zone: 1, state: 0, custom: false }, // 검정 → 제외
    { name: '양파', zone: 2, state: 1, custom: false },
    { name: '대파', zone: 2, state: 2, custom: false },
    { name: '라면', zone: 4, state: 1, custom: true },
  ]
  const p = buildPrompt(chips, [])
  const line1 = p.split('\n')[0]
  const ok = line1.endsWith('삼겹살, 달걀, 양파, 대파, 라면') && !p.includes('훈제오리')
  check('12', '나열 = 조 순서/파랑+빨강만', ok, line1)
}

// ============ 13. 프롬프트 3줄 구조: 줄 분리 + 둘째 줄(조미료) 상시 ============
{
  const chips = [
    { name: '삼겹살', zone: 1, state: 1, custom: false },
    { name: '양파', zone: 2, state: 1, custom: false },
  ]
  const lines = buildLines(chips, [])
  const p = buildPrompt(chips, [])
  const rows = p.split('\n')
  const ok =
    lines.length === 2 &&
    lines[0].startsWith('다음의 냉장고 속 재료들') &&
    lines[1] === SEASONING_LINE &&
    rows.length === 2 &&
    rows[0].startsWith('· ') &&
    rows[1].startsWith('· ')
  check('13', '줄 분리 + 조미료 상시', ok, `줄 수 ${rows.length}`)
}

// ============ 14. 종류 미선택: 셋째 줄(종류) 생략 ============
{
  const chips = [{ name: '달걀', zone: 1, state: 1, custom: false }]
  const p = buildPrompt(chips, [])
  const ok = p.split('\n').length === 2 && !p.includes('종류:')
  check('14', '종류 미선택 → 셋째 줄 없음', ok)
}

// ============ 15. 종류 다중 선택: '· 종류: 안주, 간단' ============
{
  const chips = [{ name: '달걀', zone: 1, state: 2, custom: false }]
  const p = buildPrompt(chips, ['안주', '간단'])
  const last = p.split('\n').pop()
  check('15', "종류 다중 → '· 종류: 안주, 간단'", last === '· 종류: 안주, 간단', last)
}

// ============ 16. 복사 원문: 3줄 전문(줄바꿈 유지) ============
{
  const chips = [
    { name: '삼겹살', zone: 1, state: 2, custom: false },
    { name: '양파', zone: 2, state: 1, custom: false },
  ]
  const p = buildPrompt(chips, ['간단', '안주'])
  const rows = p.split('\n')
  const ok = rows.length === 3 && p.includes('\n') && p.startsWith('· ') && rows[2] === '· 종류: 간단, 안주'
  check('16', '복사 원문 = 3줄(줄바꿈 포함)', ok, `${rows.length}줄`)
}

// ============ 17. Google: 전문 전체가 q로 인코딩 / 디코딩 왕복 일치 ============
{
  const chips = [{ name: '삼겹살', zone: 1, state: 1, custom: false }]
  const p = buildPrompt(chips, ['식사'])
  const url = buildGoogleUrl(p)
  const q = new URL(url).searchParams.get('q')
  const ok = url.startsWith('https://www.google.com/search?q=') && q === p && url.includes(encodeURIComponent('\n'))
  check('17', 'Google = 전문 전체 q (줄바꿈 포함)', ok)
}

// ============ 18. 새로고침: 칩·색·순서 복원 + recent 키 없음 ============
{
  store.clear()
  let st = loadState()
  st = persist(addChipState(st, '라면', 4).state)
  st = persist(cycleChipState(st, '달걀')) // 빨강
  st = persist(cycleChipState(st, '마늘')) // 빨강
  const raw = localStorage.getItem(STORAGE_KEY)
  const parsed = JSON.parse(raw)
  const restored = loadState()
  const egg = restored.chips.find((c) => c.name === '달걀')
  const zone1 = restored.chips.filter((c) => c.zone === 1).map((c) => c.name)
  const ok =
    !('recent' in parsed) &&
    Object.keys(parsed).sort().join() === 'chips' &&
    egg.state === 2 &&
    zone1[0] === '달걀' &&
    restored.chips.some((c) => c.name === '라면') &&
    restored.chips.length === DEFAULT_COUNT + 1
  check('18', '복원 정상 + recent 키 없음', ok, `저장 키: ${Object.keys(parsed).join()}`)
}

// ============ 19. localStorage 파손 → 기본 39종 파랑 초기화 ============
{
  store.clear()
  localStorage.setItem(STORAGE_KEY, '{ broken json !!!')
  const st1 = loadState()
  const ok1 = st1.chips.length === DEFAULT_COUNT && st1.chips.every((c) => c.state === 1)
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ chips: [{ name: '달걀', zone: 1, state: 9 }] }))
  const st2 = loadState() // 부분 파손(무효 state)도 전체 초기화
  const ok2 = st2.chips.length === DEFAULT_COUNT && st2.chips.every((c) => c.state === 1)
  check('19', '파손 → 기본 39종 파랑', ok1 && ok2)
}

// ============ 20. 드래그 폐기 정상: dnd 코드·의존성 잔재 없음 (정적 검사) ============
{
  const files = [
    '../app/src/App.jsx',
    '../app/src/components/Chip.jsx',
    '../app/src/components/ZoneList.jsx',
    '../app/src/components/ResultCard.jsx',
    '../app/src/components/KindPicker.jsx',
    '../app/src/hooks/useFridge.js',
    '../app/src/lib/storage.js',
  ]
  let clean = true
  const hits = []
  for (const f of files) {
    const raw = readFileSync(new URL(f, import.meta.url), 'utf8')
    const src = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\/\/.*$/gm, '') // 주석 제거 후 잔재 검사
    const m = src.match(/@dnd-kit|useSortable|SortableContext|DndContext|onDragEnd|onDragStart|draggable/i)
    if (m) {
      clean = false
      hits.push(`${f}:${m[0]}`)
    }
  }
  const pkg = JSON.parse(readFileSync(new URL('../app/package.json', import.meta.url), 'utf8'))
  const noDnd = !Object.keys(pkg.dependencies).some((d) => d.startsWith('@dnd-kit'))
  check('20', '드래그 코드/의존성 잔재 없음', clean && noDnd, hits.join(' | ') || `deps: ${Object.keys(pkg.dependencies).join(', ')}`)
}

// ---- 결과 출력 ----
console.log('\n=== v1.2 검증 20건 ===')
for (const r of results) {
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.id}  ${r.name}${r.ok ? '' : '  ← ' + r.detail}`)
}
console.log(`\n합계: PASS ${pass} / FAIL ${fail}`)
process.exit(fail > 0 ? 1 : 0)
