// v16-logic-test.mjs — v1.6 검증 (실행: node verify/v16-logic-test.mjs, exit 0 = ALL PASS)
// 섹션:
//   1) 이동 시맨틱 (양방향 = 표준 arrayMove, 화면 미리보기와 일치) — 앞/뒤/9칸/제자리/조간
//   2) 사이클·일괄·추가·삭제·저장 스키마(v4)·openZones
//   3) 센서 구성 정적 스캔 (TouchSensor delay=LONG_PRESS_MS 600, Mouse distance 5, 1500 금지)
//   4) 클릭 봉인 정적 스캔 (Chip isDragLinked + longPressRef 전달 + DndContext onDragStart 연결)
//   5) touch-action 스위칭 (pan-y 기본 / none 활성)
//   6) 회색 통일 (--gray 단일 정의, --off/--off-deep 잔존 금지, 참조 지점 4곳)
//   7) 7조 67종·디폴트 전부 파랑
import { readFileSync as read } from 'node:fs'

const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
}

const {
  makeDefaultChips, cycleChipState, moveChipState, setAllState,
  addChipState, removeChipState, persist, persistOpenZones, loadOpenZones,
  STORAGE_KEY,
} = await import('../src/lib/storage.js')

let pass = 0, fail = 0
const ok = (cond, label) => {
  if (cond) { pass++; console.log(' PASS', label) }
  else { fail++; console.log(' *FAIL*', label) }
}
const stripC = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
const names = (st) => st.chips.map((c) => c.name).join(',')

// zone 1 (고기·달�열) 앞에 쓸 픽스처: 9종 조 1 칩만 포함, 나머지 조는 비움
const zoneFix = (list) => ({ chips: list.map((n, i) => ({ name: n, zone: 1, state: 1, custom: false, _i: i })) })

// ---------- 섹션 1: 양방향 시맨틱 (표준 arrayMove = 화면 미리보기와 일치) ----------
console.log('--- 1. 이동 시맨틱 (양방향/미리보기 일치) ---')
{
  const base = zoneFix(['A', 'B', 'C', 'D'])
  ok(names(moveChipState(base, 'A', 'D')) === 'B,C,D,A', '앞방향 A→D = [B C D A] (D 완전 넘김, 미리보기와 일치)')
  ok(names(moveChipState(base, 'D', 'A')) === 'D,A,B,C', '뒤방향 D→A = [D A B C] (A 앞 착지)')
  ok(names(moveChipState(base, 'A', 'B')) === 'B,A,C,D', '인접 앞방향 A→B = [B A C D] (arrayMove: A가 B 자리 착지)')
  ok(names(moveChipState(base, 'B', 'A')) === 'B,A,C,D', '인접 뒤방향 B→A = [B A C D] (B가 A 자리 착지)')
  const nine = zoneFix(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'])
  ok(names(moveChipState(nine, 'A', 'I')) === 'B,C,D,E,F,G,H,I,A', '9칸 A→I = [B..I A] (최후방 넘김)')
  ok(names(moveChipState(nine, 'I', 'A')) === 'I,A,B,C,D,E,F,G,H', '9칸 I→A = [I A..H] (최전방)')
  ok(names(moveChipState(nine, 'E', 'B')) === 'A,E,B,C,D,F,G,H,I', '중간 E→B = [A E B C D F G H I]')
  ok(moveChipState(base, 'A', 'A').chips === base.chips, '제자리 드롭(A→A) = 원본 반환 (no-op, 저장 무변경)')
  ok(names(moveChipState(base, 'A', 'ZZ')) === 'A,B,C,D', '없는 타깃 = 무이동')
  ok(moveChipState(base, 'A', null).chips === base.chips, '빈 타깃(null) = 무이동')
  // 조 간 이동 금지: 조2 타깃
  const twoZone = { chips: [
    { name: 'P', zone: 1, state: 1, custom: false },
    { name: 'Q', zone: 1, state: 1, custom: false },
    { name: 'X', zone: 2, state: 1, custom: false },
  ] }
  const cross = moveChipState(twoZone, 'P', 'X')
  ok(cross.chips === twoZone.chips, '조 간 드롭(P→X) = 무이동 (zone 값 유지 — 검증 4)')
  const st = persist(zoneFix(['A', 'B', 'C']))
  const back = moveChipState(st, 'A', 'C')
  ok(JSON.parse(localStorage.getItem(STORAGE_KEY)).chips.length === 3, 'persist: chips 3개 저장 (스키마 v4 단일 키)')
  void back
  // [핵심] dnd-kit arrayMove(items, activeIndex, overIndex) = defaultNewIndexGetter 시맨틱과 전 케이스 일치 확인
  const dndArrayMove = (arr, from, to) => { const a = arr.slice(); a.splice(to, 0, a.splice(from, 1)[0]); return a }
  const arr4 = ['A', 'B', 'C', 'D']
  const cases4 = [['A','D'],['D','A'],['A','B'],['B','A'],['B','D'],['D','B'],['A','C'],['C','A'],['A','A']]
  let aligned = 0
  for (const [d, t] of cases4) {
    const expect = dndArrayMove(arr4, arr4.indexOf(d), arr4.indexOf(t)).join(',')
    const got = names(moveChipState(base, d, t))
    if (got === expect) aligned++
    console.log(`   케이스 ${d}→${t}: dnd-kit=[${expect}] 저장=[${got}] ${got === expect ? '일치' : '불일치'}`)
  }
  ok(aligned === cases4.length, '9케이스(앞/뒤/인접/중간/제자리) 모두 dnd-kit arrayMove 시맨틱과 일치 (미리보기=저장)')
  const arr9 = ['A','B','C','D','E','F','G','H','I']
  const nineCases = [['A','I'],['I','A'],['E','B'],['B','H'],['A','E']]
  let aligned9 = 0
  for (const [d, t] of nineCases) {
    const expect = dndArrayMove(arr9, arr9.indexOf(d), arr9.indexOf(t)).join(',')
    const got = names(moveChipState(nine, d, t))
    if (got === expect) aligned9++
  }
  ok(aligned9 === nineCases.length, '9칸 조 5케이스도 dnd-kit 시맨틱과 일치')
}

// ---------- 섹션 2: 사이클·일괄·추가·삭제·openZones ----------
console.log('--- 2. 사이클/일괄/추가/삭제/openZones ---')
{
  let st = persist({ chips: makeDefaultChips() })
  const first = st.chips[0].name
  st = cycleChipState(st, first); ok(st.chips.find((c) => c.name === first).state === 2, '사이클 파랑→빨강')
  st = cycleChipState(st, first); ok(st.chips.find((c) => c.name === first).state === 0, '사이클 빨강→회색(값 0)')
  st = cycleChipState(st, first); ok(st.chips.find((c) => c.name === first).state === 1, '사이클 회색→파랑')
  st = setAllState(st, 1); ok(st.chips.every((c) => c.state === 1), '모두 선택 = 전부 파랑')
  st = setAllState(st, 0); ok(st.chips.every((c) => c.state === 0), '모두 해제 = 전부 회색(값 0)')
  const add = addChipState(st, '뚝배기떡볶이라면', 4) // 커스텀 신조어 (기본재료 '라면'은 duplicate 대상)
  ok(add.result === 'added' && add.state.chips.filter((c) => c.zone === 4).at(-1).name === '뚝배기떡볶이라면', '추가: 입력한 조(4)의 맨 뒤')
  const dup = addChipState(add.state, '뚝배기떡볶이라면', 4)
  ok(dup.result === 'duplicate', '중복 이름 거부')
  const rm = removeChipState(add.state, '뚝배기떡볶이라면')
  ok(!rm.chips.some((c) => c.name === '뚝배기떡볶이라면'), 'x 삭제')
  persistOpenZones([2, 5])
  ok(JSON.stringify(loadOpenZones()) === '[2,5]', 'openZones 저장·복원 (fridge-open-zones)')
  ok(STORAGE_KEY === 'fridge-chips:v4', '저장 키 fridge-chips:v4 유지 (스키마 bump 없음)')
}

// ---------- 섹션 3: 센서 구성 정적 스캔 ----------
console.log('--- 3. 센서 구성 ---')
{
  const app = stripC(read('src/App.jsx', 'utf8'))
  const hook = stripC(read('src/hooks/useLongPressDrag.js', 'utf8'))
  ok(hook.includes('LONG_PRESS_MS = 600'), 'LONG_PRESS_MS = 600 (한곳 정의, 1~2초 범위 승인 내)')
  ok(app.includes('useSensor(TouchSensor') && app.includes('delay: LONG_PRESS_MS'), 'TouchSensor delay = LONG_PRESS_MS 참조 (단일 소스)')
  ok(app.includes('tolerance: 10'), 'TouchSensor tolerance 10 (10px 선행 이동 = 취소 → 스크롤 양보)')
  ok(app.includes('useSensor(MouseSensor') && app.includes('distance: 5'), 'MouseSensor distance 5 (PC 즉시 — 승인: 분리 유지)')
  ok(!/delay:\s*1500/.test(app), '1500ms 하드코딩 잔존 금지')
  ok(!app.includes('PointerSensor'), 'PointerSensor(단일 센서) 재도입 금지')
  ok(!app.includes('KeyboardSensor('), 'KeyboardSensor 없음')
  ok(app.includes('onDragStart={longPress.onDragStart}'), 'DndContext onDragStart → longPress (live 추적 연결)')
  ok(app.includes('onDragEnd={longPress.onDragEnd}'), 'DndContext onDragEnd → longPress (lastEnd 기록)')
}

// ---------- 섹션 4: 클릭 봉인 (색·× 오평발 방지) ----------
console.log('--- 4. 클릭 봉인 ---')
{
  const chip = stripC(read('src/components/Chip.jsx', 'utf8'))
  const zone = stripC(read('src/components/ZoneList.jsx', 'utf8'))
  ok(chip.includes('isDragLinked') && chip.includes('lp.live'), 'Chip: live 중 클릭 사이클 차단')
  ok(chip.includes('Date.now() - lp.lastEnd'), 'Chip: 종료 직후(350ms 내) 클릭 차단')
  ok(chip.includes('if (isDragLinked()) return') && (chip.match(/if \(isDragLinked\(\)\) return/g) || []).length >= 2,
    '사이클·× 두 경로 모두 봉인')
  ok(zone.includes('longPressRef={longPressRef}'), 'ZoneList → Chip longPressRef 전달')
  ok(!chip.includes('onCycle(chip.name)\n      onClick'), '직결 호출 없음 (핸들러 경유)')
}

// ---------- 섹션 5: touch-action 스위칭 ----------
console.log('--- 5. touch-action ---')
{
  const chip = stripC(read('src/components/Chip.jsx', 'utf8'))
  ok(chip.includes("isDragging ? 'none' : 'pan-y'"), '평소 pan-y(스크롤 직결) → 활성 시 none')
  ok(!chip.includes("'manipulation'"), 'manipulation 회귀 금지 (스크롤 제스처 cancel 부작용)')
  const css = read('src/styles.css', 'utf8')
  ok(!/touch-action/.test(stripC(css)), 'CSS에 touch-action 규칙 없음 (JS 인라인 단일 제어 — 주석 제외 검사)', )
}

// ---------- 섹션 6: 회색 통일 ----------
console.log('--- 6. 회색 통일 (--gray 단일) ---')
{
  const css = read('src/styles.css', 'utf8')
  const cssCode = stripC(css) // 주석 제외 (코멘트 내 변수명은 정의·참조가 아님)
  ok((cssCode.match(/--gray:\s*#/g) || []).length === 1, '--gray 값 정의 styles.css 한 곳 1회')
  ok(cssCode.includes('--gray: #9ca3af'), '값 = 연한 회색 #9ca3af')
  ok(!/--off:\s*#/.test(cssCode) && !/--off-deep:\s*#/.test(cssCode), '--off/--off-deep 변수 정의 폐기')
  ok(!/var\(--off/.test(cssCode), 'var(--off…) 참조 잔존 금지')
  ok(css.includes('.chip--s0 { background: var(--gray); }'), '회색 칩 → var(--gray)')
  ok(/\.batch-btn--off[^{]*{[^}]*var\(--gray\)/.test(css), '모두 해제 버튼 → var(--gray)')
  ok(/\.zone__fold-btn--gray\s*{[^}]*var\(--gray\)/.test(css), '펼침▼·접기▲ → var(--gray)')
  const zoneSrc = stripC(read('src/components/ZoneList.jsx', 'utf8'))
  ok(zoneSrc.includes('zone__fold-btn zone__fold-btn--gray'), '▼▲ 버튼 클래스 연결')
}

// ---------- 섹션 7: 자료·유지 규칙 ----------
console.log('--- 7. 자료/유지 ---')
{
  const dflt = makeDefaultChips()
  ok(dflt.length === 67, '67종')
  ok(new Set(dflt.map((c) => c.zone)).size === 7, '7개 조')
  ok(dflt.every((c) => c.state === 1), '첫 실행 전부 파랑')
  const appSrc = stripC(read('src/App.jsx', 'utf8'))
  ok(appSrc.includes("· 소스, 오일, 조미료, 장류 모두 보유") || read('src/lib/prompt.js', 'utf8').includes('장류 모두 보유'),
    '프롬프트 2줄 문구 유지')
}

console.log(`\n합계 PASS=${pass} FAIL=${fail}`)
process.exit(fail === 0 ? 0 : 1)
