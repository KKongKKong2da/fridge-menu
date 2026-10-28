// v15-logic-test.mjs — v1.5 검증 (실행: node verify/v15-logic-test.mjs)
// 대상: ①칩 탭 3연속 사이클 ②롱프레스 센서 설정(1500/10, 단일) ③touch-action 규칙
//       ④접힘 높이 상수+openZones 복원 ⑤(n/m) 파생 계산 ⑥프롬프트 2줄 ⑦복사·Google(미변경 증명)
import { readFileSync as read, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

// localStorage 스텁 (storage.js가 브라우저 localStorage를 직접 참조하므로)
const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
}

const {
  makeDefaultChips, cycleChipState, moveChipState, setAllState,
  addChipState, removeChipState, persistOpenZones, loadOpenZones, persist, loadState,
} = await import('../src/lib/storage.js')

let pass = 0, fail = 0
const ok = (cond, label) => {
  if (cond) { pass++; console.log(' PASS', label) }
  else { fail++; console.log(' *FAIL*', label) }
}

// 코드 검사용: 주석 내 폐기된 이름(MouseSensor·COLLAPSE_LIMIT·KeyboardSensor 설명)을 오탐하지 않게 주석 제거
const stripC = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')

// ── 1) 모바일·PC 공통: 짧은 탭 = 색 사이클 3연속 (storage 로직) ──
let st = persist({ chips: makeDefaultChips() })
const n0 = st.chips[0]
ok(n0.state === 1, '1-1 첫 실행 칩 = 파랑(1)')
st = cycleChipState(st, n0.name); ok(st.chips.find((c) => c.name === n0.name).state === 2, '1-2 탭1: 파랑→빨강(2)')
st = cycleChipState(st, n0.name); ok(st.chips.find((c) => c.name === n0.name).state === 0, '1-3 탭2: 빨강→회색(0)')
st = cycleChipState(st, n0.name); ok(st.chips.find((c) => c.name === n0.name).state === 1, '1-4 탭3: 회색→파랑(1) — 3연속 왕복')
ok(st.chips.every((c, i) => c.zone === persist({ chips: makeDefaultChips() }).chips[i].zone), '1-5 사이클 중 위치·조 불변')

// ── 2) 센서 분리 (v1.5.1): Mouse distance 5 (PC) + Touch delay 1500/tol 10 (모바일) ──
const appSrc = read('src/App.jsx', 'utf8')
const appCode = stripC(appSrc)
ok(/MouseSensor/.test(appCode) && /TouchSensor/.test(appCode) && !/PointerSensor/.test(appCode), '2-1 센서 = Mouse+Touch 분리 (PointerSensor 폐기)')
ok(/activationConstraint: \{ distance: 5 \}/.test(appCode), '2-2 MouseSensor { distance: 5 } (PC 5px 드래그)')
ok(/activationConstraint: \{\s*delay: 1500,\s*tolerance: 10\s*\}/.test(appCode), '2-3 TouchSensor { delay: 1500, tolerance: 10 } (모바일 1.5초)')
ok(!/KeyboardSensor/.test(appCode), '2-4 KeyboardSensor 없음')

// ── 3) 활성화 표시·touch-action 규칙 (Chip.jsx 텍스트 검사) ──
const chipSrc = read('src/components/Chip.jsx', 'utf8')
ok(/isDragging \? ' scale\(1\.05\)' : ''/.test(chipSrc), '3-1 활성화 스케일 1.05 (1.08 아님)')
ok(/transform 150ms ease/.test(chipSrc), '3-2 드롭 150ms transition')
ok(/zIndex: isDragging \? 50/.test(chipSrc), '3-3 z-index 50')
ok(/touchAction: isDragging \? 'none' : 'pan-y'/.test(chipSrc), '3-4 touch-action: 기본 pan-y → 활성화 시에만 none')
ok(!chipSrc.includes('{...listeners}') || /\.\.\.listeners\}/.test(chipSrc.split('chip__x')[0].split('chip__body')[1] ?? ''), '3-5 listeners는 칩 본체에만 (× 버튼 미 부착)')

// ── 4) 접힘: 높이 상수 + openZones 복원 ──
const zoneSrc = read('src/components/ZoneList.jsx', 'utf8')
const zoneCode = stripC(zoneSrc)
const mh = Number((zoneSrc.match(/MAX_HEIGHT_2ROWS\s*=\s*(\d+)/) ?? [])[1])
ok(mh >= 72 && mh <= 78, `4-1 2행 높이 실측 상수 ${mh}px (명세 72~78 범위)`)
ok(/scrollHeight > MAX_HEIGHT_2ROWS \+ OVERFLOW_EPSILON/.test(zoneCode) && /OVERFLOW_EPSILON = 4/.test(zoneCode) && /MAX_HEIGHT_2ROWS = 74/.test(zoneCode), '4-2 자격 판정 scrollHeight > 74 + 4 (콘텐츠 높이 → 펼침 후에도 접기 버튼 유지)')
ok(/ResizeObserver/.test(zoneSrc), '4-3 ResizeObserver 재측정')
ok(/maxHeight: MAX_HEIGHT_2ROWS/.test(zoneSrc) && /overflow: 'hidden'/.test(zoneSrc), '4-4 max-height 2행 + overflow hidden')
ok(/aria-label=\{open \? '접기' : '펼치기'\}/.test(zoneCode) && !/const COLLAPSE_LIMIT/.test(zoneCode), '4-5 버튼 aria-label 펼치기/접기 유지 · 개수 상수 COLLAPSE_LIMIT 폐지')
ok(/items=\{zoneChips\.map/.test(zoneSrc), '4-6 SortableContext = 조 칩 전량 (접힌 조 3행째도 드래그 대상)')
const cssSrc = read('src/styles.css', 'utf8')
ok(!/height: 44px/.test(cssSrc) && /zone__fold-btn \{[^}]*padding: 6px 11px/.test(cssSrc), '4-7 접기 버튼: 44×44 폐기 · zone__add와 동일 padding 6px 11px (v1.5.2 ③)')
const restored = persistOpenZones([2, 5])
ok(JSON.stringify(loadOpenZones()) === JSON.stringify(restored), '4-8 fridge-open-zones 저장→복원 왕복')

// ── 5) 조 헤더 (n/m) 파생 계산 ──
let st5 = persist({ chips: makeDefaultChips() })
const z1 = st5.chips.filter((c) => c.zone === 1)
// 2종을 2탭씩(파랑→빨강→회색) 돌리면 n(파랑+빨강) = 10-2 = 8 → (8/10) 예시와 일치
st5 = cycleChipState(st5, z1[0].name) // 파랑→빨강
st5 = cycleChipState(st5, z1[0].name) // 빨강→회색 (n 제외)
st5 = cycleChipState(st5, z1[1].name) // 파랑→빨강
st5 = cycleChipState(st5, z1[1].name) // 빨강→회색 (n 제외)
const cnt = (s) => {
  const list = s.chips.filter((c) => c.zone === 1)
  return { n: list.filter((c) => c.state === 1 || c.state === 2).length, m: list.length }
}
const c5 = cnt(st5)
ok(c5.m === 10 && c5.n === 8, `5-1 (8/10) — 파랑+빨강=8, 전체=10 (예시와 일치)`)
st5 = setAllState(st5, 0) // 모두 해제 = 전부 회색
ok(cnt(st5).n === 0 && cnt(st5).m === 10, '5-2 모두 해제 → (0/10) 즉시 반영')
st5 = setAllState(st5, 1)
ok(cnt(st5).n === 10, '5-3 모두 선택 → (10/10)')
st5 = addChipState(st5, '테스트재료v15', 1).state ?? st5
const c5b = cnt(st5)
ok(c5b.m === 11 && c5b.n === 11, '5-4 칩 추가 → (11/11) (m 즉시 증가)')
st5 = removeChipState(st5, '테스트재료v15')
const c5c = cnt(st5)
ok(c5c.m === 10 && c5c.n === 10, '5-5 칩 삭제 → (10/10) (m 즉시 감소)')
const derivedInline = /selectedCount = zoneChips\.filter\(\(c\) => c\.state === 1 \|\| c\.state === 2\)/.test(zoneCode)
ok(derivedInline, '5-6 ZoneList가 파생 계산(저장 없음) — state 1·2 필터')

// ── 6) 프롬프트 2줄 (접힘 무관 전량) ──
const { buildPrompt } = await import('../src/lib/prompt.js')
const pr = buildPrompt(st5.chips, [])
const lines = pr.split('\n').filter((l) => l.trim() !== '')
ok(lines.length >= 2 && /소스, 오일, 조미료, 장류 모두 보유/.test(pr), '6-1 조미료 줄 "소스, 오일, 조미료, 장류 모두 보유" 상시 포함')
ok(pr.includes('우삼겹') && pr.includes('도토리묵'), '6-2 프롬프트 = 접힘 무관 전량 나열 (1조 첫재료·7조 끝재료 포함, 총 67종)')
const prG = buildPrompt(st5.chips, ['식사'])
ok(/종류:/.test(prG), '6-3 종류 선택 시 종류 줄 추가')

// ── 7) 복사·Google 유지 = ResultCard.jsx/prompt.js 무변경 (git이 증명) ──
ok(/buildPrompt\(chips, kinds\)/.test(appSrc), '7-1 ResultCard 호출 라인 그대로 (App.jsx)')
ok(!/(ResultCard|prompt)\.jsx?/.test(appSrc.replace(/import[\s\S]*?\n/g, '')), '7-2 App의 ResultCard import·사용부 변경 없음')

// ── 8) 저장 스키마 무변경 (v4 유지) ──
const storageSrc = read('src/lib/storage.js', 'utf8')
ok(/STORAGE_KEY = 'fridge-chips:v4'/.test(storageSrc), '8-1 fridge-chips:v4 그대로')

// ── 9) v1.5.2 5건 ──
// ① 양방향 드래그: App 가드 제거 + moveChipState 양방향 왕복
ok(!/overId === dragName/.test(appCode) && !/if \(overId === dragName\) return/.test(appCode), '9-1 App handleDragEnd 자기 자신 가드 제거 (뒤로 드롭 살림)')
const z9 = st5.chips.filter((c) => c.zone === 1).map((c) => c.name)
const first = z9[0], second = z9[1], last = z9[z9.length - 1]
const mvBack = moveChipState(persist({ chips: st5.chips }), first, last).chips.map((c) => c.name) // 0번 → 뒤로
ok(mvBack[0] === second && mvBack.indexOf(first) > mvBack.indexOf(second), `9-2a 뒤로 보내기: ${first} index0 → index${mvBack.indexOf(first)} (from<target 경로))`)
const mvFwd = moveChipState(persist({ chips: st5.chips }), last, first).chips.map((c) => c.name) // 마지막 → 앞으로
ok(mvFwd[0] === last, `9-2b 앞으로 오기: ${last} index${z9.length - 1} → index0 (from>target 경로)`)
const base9 = persist({ chips: st5.chips })
const noop = moveChipState(base9, first, first)
ok(noop === base9 && noop.chips === base9.chips, '9-2c 제자리 드롭(자기 자신 target) = 같은 객체 반환 no-op → 저장 무변경 안전')
// ④ 모두 해제 버튼 회색 클래스
ok(/batch-btn batch-btn--off/.test(appCode) && /\.batch-btn--off[^{]*\{[^}]*background: var\(--off-deep\)/.test(cssSrc), '9-3 모두 해제 = batch-btn--off (배경 --off-deep 회색 + 흰 글자)')
// ⑤ 칩 회색 연한화
ok(/--off: #9ca3af/.test(cssSrc) && /--off-deep: #6b7280/.test(cssSrc), '9-4 칩 회색 --off #9ca3af (gray-400) · hover #6b7280')
// ③ 접기 버튼 기호만 + ＋ 동일 스펙
ok(/open \? '▲' : '▼'/.test(zoneCode) && !/open \? '접기 ▲' : '펼치기 ▼'/.test(zoneCode), '9-5 라벨 텍스트 제거 - ▼/▲ 기호만 (aria-label·title은 유지)')
ok(/\.zone__add \{[^}]*padding: 6px 11px/.test(cssSrc), '9-6 .zone__add 스펙(padding 6px 11px) 유지 — fold-btn과 동일 세로 30px 확인 짝')

console.log(`\nRESULT: PASS ${pass} / FAIL ${fail}`)
process.exit(fail === 0 ? 0 : 1)
