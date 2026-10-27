// verify/v13-logic-test.mjs — v1.3 검증 케이스 14건 (node 로직 시뮬)
// 실행: node verify/v13-logic-test.mjs   (fridge-menu 폴더에서)
// React/CSS 렌더가 필요한 것(3의 채움 색, 8의 ⓘ 토글)은 코드 정적 확인으로 대체 표시.
import {
  STORAGE_KEY,
  LEGACY_KEYS,
  addChipState,
  completeMigration,
  cycleChipState,
  dropIntoEmptyZone,
  loadState,
  makeDefaultChips,
  moveChipState,
  persist,
  readLegacyJson,
  removeChipState,
  screenOrder,
  setAllState,
} from '../app/src/lib/storage.js'
import { DEFAULT_COUNT, DEFAULT_MATERIALS, ZONE_ORDER } from '../app/src/data/materials.js'
import { SEASONING_LINE, buildGoogleUrl, buildLines, buildPrompt, PROMPT_EMPTY_MSG } from '../app/src/lib/prompt.js'
import { scanSource } from './var-scan.mjs'

// 전수검사 스캔 결과 (13번 + 3/4/8/10 정적 확인에 사용)
const varScan = scanSource()
const text = (name) => varScan.textOf(name)
const styles = text('styles.css')
const app = text('App.jsx')
const result = text('ResultCard.jsx')
const storage = text('storage.js')
const storageCode = varScan.codeOf('storage.js') // 주석 제거 후 코드 토큰만
const resultCode = varScan.codeOf('ResultCard.jsx')

// ---------- localStorage 목 ----------
const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
}

let pass = 0
let fail = 0
const check = (label, cond, extra = '') => {
  if (cond) {
    pass += 1
    console.log(`  PASS ${label}${extra ? ' — ' + extra : ''}`)
  } else {
    fail += 1
    console.log(`  FAIL ${label}${extra ? ' — ' + extra : ''}`)
  }
}

const byName = (chips, name) => chips.find((c) => c.name === name)

// ============ 1. 첫 실행: 63종 전부 파랑, 조 6개 순서 ============
console.log('[1] 첫 실행')
localStorage.clear()
{
  const { chips, migrationNeeded } = loadState()
  check('1-a 63종', chips.length === 63, `count=${chips.length} (상수 ${DEFAULT_COUNT}, 리스트 합산 ${DEFAULT_MATERIALS.length})`)
  check('1-b 전부 파랑', chips.every((c) => c.state === 1))
  check('1-c 조 6개 1→6 순서', ZONE_ORDER.join(',') === '1,2,3,4,5,6' && chips[0].zone === 1)
  const zoneSeq = [...new Set(screenOrder(chips).map((c) => c.zone))]
  check('1-d 화면 순서 = 조 번호순', zoneSeq.join(',') === '1,2,3,4,5,6')
  check('1-e 신규 키 첫 실행이면 안내 없음', migrationNeeded === false)
  const perZone = ZONE_ORDER.map((z) => chips.filter((c) => c.zone === z).length)
  check('1-f 조별 수 9/16/10/14/5/9', perZone.join('/') === '9/16/10/14/5/9', `=${perZone.join('/')}`)
  check('1-g 신규 저장 키 = fridge-chips:v3', STORAGE_KEY === 'fridge-chips:v3')
}

// ============ 2. 초기화 흐름: 레거시 → 안내 + 백업 → 확인 → 63종 ============
console.log('[2] 초기화 흐름')
localStorage.clear()
{
  const legacy = JSON.stringify({
    chips: [
      { name: '스테이크', zone: 1, state: 2, custom: false },
      { name: '라면', zone: 4, state: 0, custom: true },
    ],
  })
  localStorage.setItem('fridge-chips', legacy)
  const loaded = loadState()
  check('2-a 레거시 감지 → 안내 표시', loaded.migrationNeeded === true)
  check('2-b 안내 시 63종 파랑 생성', loaded.chips.length === 63 && loaded.chips.every((c) => c.state === 1))
  check('2-c 백업 복사 원문 = v1.2 chips JSON', readLegacyJson() === legacy)
  const json = JSON.parse(readLegacyJson())
  check('2-d 백업에 삭제된 구 재료 스테이크 포함', json.chips.some((c) => c.name === '스테이크'))
  const done = completeMigration(loaded.chips)
  check('2-e 초기화 확인 완료', done === true)
  check('2-f 신규 키 저장', localStorage.getItem(STORAGE_KEY) !== null)
  check('2-g 레거시 키 삭제', LEGACY_KEYS.every((k) => localStorage.getItem(k) === null))
  check('2-h v1.1 recent 잔존 키도 삭제', localStorage.getItem('fridge-recent') === null)
  const after = loadState()
  check('2-i 이후 실행은 안내 없이 63종 그대로', after.migrationNeeded === false && after.chips.length === 63)
}

// ============ 3. 색 3종 순환 (파랑→빨강→회색→파랑) ============
console.log('[3] 색 순환')
localStorage.clear()
{
  let st = { chips: makeDefaultChips() }
  const name = '우삼겹'
  check('3-a 시작 파랑', byName(st.chips, name).state === 1)
  st = cycleChipState(st, name)
  check('3-b 파랑→빨강(2)', byName(st.chips, name).state === 2)
  st = cycleChipState(st, name)
  check('3-c 빨강→회색(0)', byName(st.chips, name).state === 0)
  st = cycleChipState(st, name)
  check('3-d 회색→파랑(1)', byName(st.chips, name).state === 1)
  const cur = cycleChipState(cycleChipState(cycleChipState(st, '달걀'), '달걀'), '달걀')
  check('3-e 회색→파랑 1터치 복귀', byName(cur.chips, '달걀').state === 1)
  const colors = ['--blue: #2563eb', '--red: #dc2626', '--off: #6b7280']
  check('3-f CSS 3색 정의 (styles.css)', colors.every((c) => styles.includes(c)), 'styles.css 정적 확인')
}

// ============ 4. 위치 불변 (자동이동 삭제) ============
console.log('[4] 위치 불변')
localStorage.clear()
{
  const base = makeDefaultChips()
  let st = { chips: base.map((c) => ({ ...c })) }
  const beforeOrder = st.chips.map((c) => c.name)
  st = cycleChipState(st, '삼겹살')
  const afterRed = st.chips.map((c) => c.name)
  check('4-a 빨강 전환 후 배열 순서 동일', beforeOrder.join('|') === afterRed.join('|'))
  st = cycleChipState(st, '삼겹살')
  const afterOff = st.chips.map((c) => c.name)
  check('4-b 회색 전환 후 배열 순서 동일', beforeOrder.join('|') === afterOff.join('|'))
  const idx = beforeOrder.indexOf('삼겹살')
  check('4-c 삼겹살 인덱스·state 불변', afterOff[idx] === '삼겹살' && st.chips[idx].state === 0)
  check('4-d applyZoneMove 코드 완전 제거, moveChipState 단일 소스', !storageCode.includes('applyZoneMove') && storageCode.includes('export function moveChipState'))
  const zoneIdx = st.chips.filter((c) => c.zone === 1).map((c) => c.name)
  check('4-e 조 1 안 순서도 그대로 (선두 이동 없음)', zoneIdx[0] === '우삼겹')
}

// ============ 5. 드래그 조 내 (순서 변경 + 저장/복원) ============
console.log('[5] 드래그 조 내')
localStorage.clear()
{
  let st = { chips: makeDefaultChips() }
  // 조 1: 우삼겹, 갈비살, 불고기, 삼겹살 ... → 달걀을 조 1 선두로
  st = moveChipState(st, '달걀', '우삼겹')
  const zone1 = st.chips.filter((c) => c.zone === 1).map((c) => c.name)
  check('5-a 조 안 순서 변경(달걀 선두)', zone1[0] === '달걀' && zone1[1] === '우삼겹')
  check('5-b 조 안 이동은 zone 유지', byName(st.chips, '달걀').zone === 1)
  check('5-c 다른 조 순서 불변', st.chips.filter((c) => c.zone === 2).map((c) => c.name)[0] === '마늘')
  persist(st)
  const reload = loadState()
  const r1 = reload.chips.filter((c) => c.zone === 1).map((c) => c.name)
  check('5-d 새로고침 후 순서 복원', r1[0] === '달걀' && reload.chips.length === 63)
  const names = reload.chips.map((c) => c.name)
  check('5-e 프롬프트 나열 = 화면(flatten) 순서', screenOrder(reload.chips)[0].name === '달걀' && names.length === 63)
  // 소시지(조 1 최후미) 타깃 = 달걀이 소시지 직전 자리로 (dnd 타깃 자리 이동)
  st = moveChipState(st, '달걀', byName(st.chips, '소시지').name)
  const z1b = st.chips.filter((c) => c.zone === 1).map((c) => c.name)
  check('5-f 칩 사이/끝 드롭 (소시지 타깃 = 달걀→소시지 자리교환, 최후미 소시지)', z1b.join(',') === '우삼겹,갈비살,불고기,삼겹살,대패삼겹살,닭다리살,훈제오리,달걀,소시지')
}

// ============ 6. 드래그 조 간 (zone 변경 + 프롬프트 반영 + 빈 조) ============
console.log('[6] 드래그 조 간')
localStorage.clear()
{
  let st = { chips: makeDefaultChips() }
  // 달걀(zone 1) → 조 5(유제품)의 우유 타깃 (우유 자리로 삽입 = 우유 앞)
  st = moveChipState(st, '달걀', '우유')
  check('6-a 교차 드롭 시 zone 변경', byName(st.chips, '달걀').zone === 5)
  const z5 = st.chips.filter((c) => c.zone === 5).map((c) => c.name)
  check('6-b 드롭한 자리(우유 타깃)에 삽입', z5.join(',') === '달걀,우유,두유,버터,모짜렐라치즈,그릭요거트')
  check('6-c 조 1에서는 빠짐', !st.chips.filter((c) => c.zone === 1).some((c) => c.name === '달걀'))
  // custom 칩도 조 간 이동 가능
  const added = addChipState(st, '라면', 4)
  st = added.state
  check('6-d 직접입력 라면 = 입력한 조 4', byName(st.chips, '라면').zone === 4 && byName(st.chips, '라면').custom === true)
  st = moveChipState(st, '라면', '우유')
  check('6-e custom 칩도 조 간 이동', byName(st.chips, '라면').zone === 5)
  // 빈 조로 이동
  st = { chips: st.chips.filter((c) => c.zone !== 3) }
  const emptyZone3 = st.chips.filter((c) => c.zone === 3).length === 0
  st = moveChipState(st, '달걀', '마늘')
  st = dropIntoEmptyZone(st, '달걀', 3)
  const z3 = st.chips.filter((c) => c.zone === 3).map((c) => c.name)
  check('6-f 빈 조 드롭 → 그 조 마지막 칩', emptyZone3 && z3.length === 1 && z3[0] === '달걀' && byName(st.chips, '달걀').zone === 3)
  // 프롬프트 반영 (화면 순서 = 나열 순서)
  persist(st)
  const re = loadState()
  const prompt = buildPrompt(re.chips, [])
  const list = prompt.split('\n')[0]
  const flat = screenOrder(re.chips).filter((c) => c.state !== 0).map((c) => c.name)
  check('6-g 프롬프트 나열 순서 = 화면 순서(zone 1→6)', list.includes(`: ${flat.slice(0, 4).join(', ')}`) && list.includes('달걀') && list.includes('라면'))
  check('6-h 이동 후 저장/복원 유지', byName(re.chips, '달걀').zone === 3 && byName(re.chips, '라면').zone === 5)
}

// ============ 7. 모두 선택 / 모두 해제 (순서 유지, 빨강 포함) ============
console.log('[7] 일괄 버튼')
localStorage.clear()
{
  let st = { chips: makeDefaultChips() }
  st = cycleChipState(st, '삼겹살') // 빨강
  st = cycleChipState(st, '우유')
  st = cycleChipState(st, '우유') // 회색
  const beforeOrder = st.chips.map((c) => c.name)
  const sel = setAllState(st, 1)
  check('7-a 모두 선택 = 전원 파랑(빨강·회색 포함)', sel.chips.every((c) => c.state === 1))
  check('7-b 모두 선택 순서 유지', sel.chips.map((c) => c.name).join('|') === beforeOrder.join('|'))
  const desel = setAllState(st, 0)
  check('7-c 모두 해제 = 전원 회색(빨강 포함)', desel.chips.every((c) => c.state === 0))
  check('7-d 모두 해제 순서 유지', desel.chips.map((c) => c.name).join('|') === beforeOrder.join('|'))
  const pr = buildPrompt(desel.chips, [])
  check('7-e 모두 해제 후 프롬프트 = null(빈 메시지 경로)', pr === null && PROMPT_EMPTY_MSG === '쓸 재료를 파랑/빨강으로 표시해주세요')
  persist(desel)
  check('7-f 일괄 상태 저장', loadState().chips.every((c) => c.state === 0))
}

// ============ 8. ⓘ 토글 (코드 정적 확인) ============
console.log('[8] ⓘ 토글')
{
  check('8-a 헤더 타이틀에 ⓘ 버튼 존재 (App.jsx)', app.includes('info-btn') && app.includes('setHelpOpen'))
  check('8-b 기본 접힘 (helpOpen useState(false))', /const \[helpOpen, setHelpOpen\] = useState\(false\)/.test(app))
  check('8-c 설명 2~3줄 줄글 + 구 설명 2줄(app__hint) 삭제', app.includes('app__help') && !app.includes('app__hint'))
  check('8-d 설명 문구 3문장 (빨강 임박/회색 제외/길게 눌러 이동)', app.includes('빨강으로') && app.includes('회색은 이번 추천에서 빼는 재료예요') && app.includes('길게 눌러'))
}

// ============ 9. 프롬프트 (3줄 분리, 둘째 줄 축약, 종류 생략) ============
console.log('[9] 프롬프트')
localStorage.clear()
{
  const chips = [
    { name: '닭다리살', zone: 1, state: 1, custom: false },
    { name: '달걀', zone: 1, state: 2, custom: false },
    { name: '우유', zone: 5, state: 0, custom: false }, // 회색 → 미포함
  ]
  const lines = buildLines(chips, [])
  check('9-a 2줄 (종류 미선택 시 셋째 줄 생략)', lines.length === 2)
  const full = buildPrompt(chips, [])
  const rows = full.split('\n')
  check('9-b 첫 줄 재료 나열 (파랑+빨강만, 화면 순서)', rows[0] === '· 다음의 냉장고 속 재료들 일부로 만들 수 있는 레시피를 추천해줘: 닭다리살, 달걀', rows[0])
  check('9-c 둘째 줄 축약형', rows[1] === '· 소스, 오일, 조미료 모두 보유' && SEASONING_LINE === '소스, 오일, 조미료 모두 보유')
  const withKind = buildLines(chips, ['간단', '안주'])
  check('9-d 종류 선택 시 셋째 줄', withKind[2] === '종류: 간단, 안주')
  check('9-e 회색 칩은 나열에 없음', !full.includes('우유'))
  check('9-f 재료 0 → null', buildLines(chips.map((c) => ({ ...c, state: 0 })), []) === null)
}

// ============ 10. 복사 / Google ============
console.log('[10] 복사 / Google')
{
  const chips = [
    { name: '닭다리살', zone: 1, state: 1, custom: false },
    { name: '달걀', zone: 1, state: 2, custom: false },
  ]
  const full = buildPrompt(chips, ['식사'])
  check('10-a 복사 원문 = 3줄(줄바꿈 2개 유지)', (full.match(/\n/g) || []).length === 2 && full.startsWith('· ') && full.includes('종류: 식사'))
  const url = buildGoogleUrl(full)
  check('10-b Google URL 인코딩 (search?q, %0A, %EB...)', url.startsWith('https://www.google.com/search?q=') && url.includes('%0A') && decodeURIComponent(url.split('q=')[1]) === full)
  // LLM_URLS·claude는 코드 토큰(codeOf) 기준, '복사' 버튼 표시 문구는 원문(textOf) 기준
  check('10-c 발판 2개만 (복사/Google) — 구 4발판 LLM_URLS·Claude 코드 없음', !resultCode.includes('LLM_URLS') && !resultCode.includes('claude') && !resultCode.includes('gemini') && resultCode.includes('buildGoogleUrl') && result.includes('복사') && result.includes('Google'))
}

// ============ 11. 회색만 있을 때 ============
console.log('[11] 회색만')
{
  const chips = makeDefaultChips().map((c) => ({ ...c, state: 0 }))
  check('11-a prompt null → PROMPT_EMPTY_MSG', buildPrompt(chips, []) === null && PROMPT_EMPTY_MSG.length > 0)
}

// ============ 12. 새로고침 왕복 (칩·색·순서·zone 복원) ============
console.log('[12] 새로고침 왕복')
localStorage.clear()
{
  let st = { chips: makeDefaultChips() }
  st = cycleChipState(st, '삼겹살') // 빨강
  st = cycleChipState(st, '마늘')
  st = cycleChipState(st, '마늘') // 회색
  st = moveChipState(st, '달걀', '우삼겹') // 조 1 선두
  st = moveChipState(st, '달걀', '우유') // 조 5로
  const add = addChipState(st, '라면', 4)
  st = add.state
  persist(st)
  const re = loadState()
  check('12-a 칩 개수 복원(64)', re.chips.length === 64)
  check('12-b 색 복원', byName(re.chips, '삼겹살').state === 2 && byName(re.chips, '마늘').state === 0)
  check('12-c zone 복원', byName(re.chips, '달걀').zone === 5 && byName(re.chips, '라면').zone === 4)
  const z5 = re.chips.filter((c) => c.zone === 5).map((c) => c.name)
  check('12-d 순서 복원(조 5: 달걀,우유,두유,버터,모짜렐라,그릭)', z5.join(',') === '달걀,우유,두유,버터,모짜렐라치즈,그릭요거트')
  check('12-e 화면 순서 = 저장 순서 = 프롬프트 나열 (단일 소스)', re.chips.map((c) => c.name).join('|') === screenOrder(re.chips).map((c) => c.name).join('|'))
  check('12-f migration 안내 없이 복원', re.migrationNeeded === false)
}

// ============ 13. var 검사 (var-scan.mjs 결과 연동) ============
console.log('[13] var 검사')
{
  const scan = varScan
  check('13-a 소스 var 0건', scan.varCount === 0, `files=${scan.fileCount}`)
  check('13-b window 전역 남용 없음 (clipboard 폴백만 허용)', scan.windowHits.length === 0)
  check('13-c 파일 간 export 이름 중복 정의 없음', scan.dupeExports.length === 0, scan.dupeExports.join(',') || 'no dupes')
}

// ============ 14. 파손 데이터 ============
console.log('[14] 파손 데이터')
localStorage.clear()
{
  localStorage.setItem(STORAGE_KEY, '{not-json')
  check('14-a JSON 파손 → 63종 파랑', (() => { const s = loadState(); return s.chips.length === 63 && s.chips.every((c) => c.state === 1) })())
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ chips: [{ name: '소금', zone: 99, state: 1, custom: false }] }))
  check('14-b zone 무효 → 63종 파랑', (() => { const s = loadState(); return s.chips.length === 63 })())
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ chips: [{ name: '소금', zone: 1, state: 7, custom: false }, { name: '달걀', zone: 1, state: 1, custom: false }] }))
  check('14-c 부분 파손도 전체 초기화', (() => { const s = loadState(); return s.chips.length === 63 && s.chips.every((c) => c.state === 1) })())
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ chips: 'nope' }))
  check('14-d chips 비배열 → 63종 파랑', (() => { const s = loadState(); return s.chips.length === 63 })())
  localStorage.clear()
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ chips: [{ name: '라면', zone: 4, state: 2, custom: true }] }))
  const ok = loadState()
  check('14-e 정상 1칩은 그대로 (초기화 아님)', ok.chips.length === 1 && byName(ok.chips, '라면').state === 2)
}

// ---------- v1.2 검증 중 유효한 것 회귀 (이동 제거로 폐기된 케이스 제외) ----------
console.log('[R] v1.2 회귀 (적용 가능한 것)')
localStorage.clear()
{
  let st = { chips: makeDefaultChips() }
  const dup = addChipState(st, '달걀', 2)
  check('R-a 중복 방지 (기존 칩 유지, result=duplicate)', dup.result === 'duplicate' && dup.state.chips.length === 63)
  const empty = addChipState(st, '   ', 2)
  check('R-b 공백 입력 무시', empty.result === 'empty')
  const custom = addChipState(st, '라면', 3)
  check('R-c v1.3: 입력한 조로 추가 (기본재료 원래 조 복원 규칙 폐기 → 새 이름도 입력 조)', custom.result === 'added' && byName(custom.state.chips, '라면').zone === 3)
  const steak = addChipState(st, '스테이크', 5)
  check('R-d 삭제된 구 기본 재료 재입력 → 입력한 조 5 (복원 규칙 폐기)', byName(steak.state.chips, '스테이크').zone === 5 && steak.state.chips.length === 64)
  const rm = removeChipState(custom.state, '라면')
  check('R-e x 삭제', rm.chips.length === 63 && !rm.chips.some((c) => c.name === '라면'))
}

console.log(`\nRESULT: PASS ${pass} / FAIL ${fail}`)
process.exit(fail === 0 ? 0 : 1)
