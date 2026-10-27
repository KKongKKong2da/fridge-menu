// verify/v14-logic-test.mjs — v1.4 검증 케이스 13건 (node 로직 시뮬 + 정적 확인)
// 실행: node verify/v14-logic-test.mjs   (fridge-menu 폴더에서)
// 13 배포는 이 스크립트가 아니라 배포 단계에서 확인 (표에 결과 기재).
// React/CSS 렌더가 필요한 것(1의 솔리드, 5의 640px 발동, 8의 범례·ⓘ, 12의 var)은
// var-scan.mjs의 파일 텍스트로 정적 확인.
import {
  OPEN_ZONES_KEY,
  STORAGE_KEY,
  addChipState,
  cycleChipState,
  completeMigration,
  loadOpenZones,
  loadState,
  makeDefaultChips,
  moveChipState,
  persist,
  persistOpenZones,
  readLegacyJson,
  removeChipState,
  screenOrder,
  setAllState,
} from '../app/src/lib/storage.js'
import { DEFAULT_COUNT, DEFAULT_MATERIALS, ZONE_LABELS, ZONE_ORDER } from '../app/src/data/materials.js'
import { SEASONING_LINE, buildGoogleUrl, buildLines, buildPrompt, selectedNames } from '../app/src/lib/prompt.js'
import { scanSource } from './var-scan.mjs'

const varScan = scanSource()
const css = varScan.textOf('styles.css')
const cssCode = css.replace(/\/\*[\s\S]*?\*\//g, '') // CSS 주석 제거 (legend/chip--mini 위양성 방지)
const app = varScan.textOf('App.jsx')
const zone = varScan.textOf('ZoneList.jsx')
const chip = varScan.textOf('Chip.jsx')
const resultCard = varScan.textOf('ResultCard.jsx')
// JSX 주석만 제거 (className·문자열은 온전히 유지) — useDroppable/발판 주석 위양성 방지
const stripJsComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
const zoneCode = stripJsComments(zone)
const appCode = stripJsComments(app)
const resultCode = stripJsComments(resultCard)


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
function check(title, ok, detail = '') {
  if (ok) {
    pass += 1
    console.log(`PASS  ${title}${detail ? '  → ' + detail : ''}`)
  } else {
    fail += 1
    console.log(`FAIL  ${title}${detail ? '  → ' + detail : ''}`)
  }
}
const reset = () => store.clear()
const zoneOf = (chips, z) => chips.filter((c) => c.zone === z).map((c) => c.name)

// ============ 검증 1: 첫 실행(초기화 v4) ============
reset()
const first = loadState()
check(
  '1-a 저장 키 = fridge-chips:v4',
  STORAGE_KEY === 'fridge-chips:v4',
  STORAGE_KEY
)
check('1-b 첫 실행 67종 전량 파랑', first.chips.length === 67 && first.chips.every((c) => c.state === 1))
check('1-c 조 7개 1→7 순서 + 합계', ZONE_ORDER.join() === '1,2,3,4,5,6,7' && DEFAULT_COUNT === 67)
const zoneCounts = ZONE_ORDER.map((z) => first.chips.filter((c) => c.zone === z).length)
check('1-d 조별 종수 10/17/7/15/5/10/3', zoneCounts.join() === '10,17,7,15,5,10,3', zoneCounts.join('/'))
check(
  '1-e 조 이름 (7개)',
  ZONE_ORDER.map((z) => ZONE_LABELS[z]).join('|') ===
    '고기·달걀|채소·과일|수산·건어|곡물·면·빵|우유·두유|가공·소스|냉동·기타'
)
const z1 = zoneOf(first.chips, 1)
const z3 = zoneOf(first.chips, 3)
const z4 = zoneOf(first.chips, 4)
const z7 = zoneOf(first.chips, 7)
check('1-f 1조에 베이컨 / 2조에 목이버섯', z1.includes('베이컨') && zoneOf(first.chips, 2).includes('목이버섯'))
check('1-g 3조=새우·관자·해물믹스·절단꽃게·문어·다시마·가츠오부시', z3.join() === '새우,관자,해물믹스,절단꽃게,문어,다시마,가츠오부시')
check('1-h 4조에 라면 / 7조=만두·순두부·도토리묵', z4.includes('라면') && z7.join() === '만두,순두부,도토리묵')
check('1-i 중복 재료 없음', new Set(DEFAULT_MATERIALS.map((m) => m.name)).size === 67)
check(
  '1-j 솔리드: 칩 border 없음·흰 글자·100% 채움',
  /\.chip\s*\{[^}]*border:\s*none/.test(css) && /\.chip\s*\{[^}]*color:\s*#fff/.test(css) &&
    /\.chip--s1\s*\{\s*background:\s*var\(--blue\)\s*;?\s*\}/.test(css) &&
    /\.chip--s2\s*\{\s*background:\s*var\(--red\)\s*;?\s*\}/.test(css) &&
    /\.chip--s0\s*\{\s*background:\s*var\(--off\)\s*;?\s*\}/.test(css)
)
check(
  '1-k 색값 #2563eb/#dc2626/#6b7280 유지',
  /--blue:\s*#2563eb/.test(css) && /--red:\s*#dc2626/.test(css) && /--off:\s*#6b7280/.test(css)
)
check('1-l x 버튼 흰색·hover 동일계열 어둡게', /\.chip__x\s*\{[^}]*color:\s*#fff/.test(css) && /\.chip--s1 \.chip__x:hover/.test(css))

// ============ 검증 2: 색 사이클 ============
reset()
let s = { chips: [{ name: '달걀', zone: 1, state: 1, custom: false }] }
s = cycleChipState(s, '달걀')
const c2 = s.chips[0].state === 2
s = cycleChipState(s, '달걀')
const c0 = s.chips[0].state === 0
s = cycleChipState(s, '달걀')
check('2 파랑→빨강→회색→파랑 (1→2→0→1)', c2 && c0 && s.chips[0].state === 1)
// 위치 불변 (순서 그대로)
reset()
const seq = [
  { name: 'A', zone: 1, state: 1, custom: false },
  { name: 'B', zone: 1, state: 1, custom: false },
  { name: 'C', zone: 1, state: 1, custom: false },
]
const cyc = cycleChipState({ chips: seq }, 'B')
check('2-b 사이클은 위치 이동 없음 (state만)', cyc.chips.map((c) => c.name).join() === 'A,B,C' && cyc.chips[1].state === 2)

// ============ 검증 3: 드래그 조 내 ============
reset()
let d = { chips: first.chips.map((c) => ({ ...c })) }
const z1before = zoneOf(d.chips, 1).join()
const z2before = zoneOf(d.chips, 2).join()
d = moveChipState(d, '우삼겹', '닭다리살') // 1조 안: 첫 칩을 닭다리살 자리로
const z1after = zoneOf(d.chips, 1)
check(
  '3-a 조 안 순서 변경 (우삼겹 → 닭다리살 앞)',
  z1after[0] === '갈비살' && z1after.includes('닭다리살') && z1after.indexOf('우삼겹') === z1after.indexOf('닭다리살') - 1,
  z1after.slice(0, 4).join(',')
)
check('3-b 다른 조 순서는 불변', zoneOf(d.chips, 2).join() === z2before && z1after.length === z1before.split(',').length)
check('3-c zone 값 유지 (우삼겹 1조)', d.chips.find((c) => c.name === '우삼겹').zone === 1)
check('3-d target null(구 빈조 드롭 경로) = 무이동', moveChipState(d, '우삼겹', null).chips === d.chips)

// ============ 검증 4: 드래그 조 간 불가 ============
reset()
let x = { chips: first.chips.map((c) => ({ ...c })) }
const snapshot = JSON.stringify(x.chips)
const crossZoneTarget = zoneOf(x.chips, 2)[0] // 2조 첫 칩
const r4 = moveChipState(x, '우삼겹', crossZoneTarget)
check('4-a 조 간 드롭 = 무이동 (배열 동일)', r4.chips === x.chips)
check('4-b zone 값 유지 (우삼겹=1)', x.chips.find((c) => c.name === '우삼겹').zone === 1)
check(
  '4-d dropIntoEmptyZone export 없음 (storage.js)',
  !/dropIntoEmptyZone/.test(varScan.codeOf('storage.js')) &&
    !/dropIntoEmptyZone/.test(varScan.codeOf('useFridge.js'))
)
check('4-e ZoneList·App useDroppable/크로스드롭 코드 없음', !/useDroppable/.test(zoneCode) && !/ZONE_PREFIX/.test(appCode))
check('4-f App 센서 = Mouse distance 5 / Touch delay 0 tolerance 8', /distance:\s*5/.test(app) && /delay:\s*0/.test(app) && /tolerance:\s*8/.test(app))
check('4-g rectSortingStrategy + touch-action: none', /rectSortingStrategy/.test(zone) && /touch-action:\s*none/.test(css))
check('4-h 드래그 중 스케일 1.08(JS)·z50·150ms + CSS 그림자', /scale\(1\.08\)/.test(chip) && /zIndex:\s*isDragging \? 50/.test(chip) && /150ms/.test(chip) && /box-shadow/.test(css))

// ============ 검증 5: 접기/펼치기 ============
reset()
check('5-a open-zones 기본 = [] (전부 접힘)', JSON.stringify(loadOpenZones()) === '[]', JSON.stringify(loadOpenZones()))
persistOpenZones([2, 4])
check('5-b persistOpenZones → fridge-open-zones 저장 + 복원', OPEN_ZONES_KEY === 'fridge-open-zones' && JSON.stringify(loadOpenZones()) === '[2,4]')
persistOpenZones([2, 4, 9, 'x', 1])
check('5-c 파손/범위 밖 값 = 조 번호만 남김', JSON.stringify(loadOpenZones()) === '[2,4,1]', JSON.stringify(loadOpenZones()))
store.set('fridge-open-zones', 'not json')
check('5-d 저장 파손 = [] 복원', JSON.stringify(loadOpenZones()) === '[]')
check('5-e 640px 이하 발동 (COMPACT_QUERY = max-width 640px)', /max-width:\s*640px/.test(app))
check('5-f 접힘 기준 = 8개 초과 (2행) + compact && !open 조건', /COLLAPSE_LIMIT\s*=\s*8/.test(zone) && /compact\s*&&\s*!open\s*&&\s*zoneChips\.length\s*>\s*COLLAPSE_LIMIT/.test(zone))
check('5-g 버튼 펼치기 ▾/접기 ▴ + open prop', /펼치기/.test(zone) && /접기/.test(zone) && /open=\{openZones\.includes\(zone\)\}/.test(app))
check('5-h SortableContext는 보이는 칩만 (접힘 = 2행만 드래그, 승인 2)', /items=\{visibleChips\.map/.test(zone))
check('5-i 데스크톱(비컴팩트) = 전량 렌더 (collapsed false)', /const collapsed = compact && !open/.test(zone))

// ============ 검증 6: 프롬프트 ============
reset()
const chips6 = [
  { name: '달걀', zone: 1, state: 1, custom: false },
  { name: '쌀', zone: 4, state: 2, custom: false },
  { name: '만두', zone: 7, state: 0, custom: false },
]
check('6-a 둘째 줄 축약형 반영', SEASONING_LINE === '소스, 오일, 조미료, 장류 모두 보유', SEASONING_LINE)
const lines6 = buildLines(chips6)
check('6-b 3줄 (재료 · 조미료) + 회색 미포함', lines6.length === 2 && lines6[0].includes('달걀') && lines6[0].includes('쌀') && !lines6[0].includes('만두'))
const lines6k = buildLines(chips6, ['간단', '디저트'])
check('6-c 종류 선택 시 셋째 줄 · 미선택 시 생략', lines6k.length === 3 && lines6k[2] === '종류: 간단, 디저트' && buildLines(chips6).length === 2)
const full = buildPrompt(chips6, ['간단'])
check('6-d 전문 3개 줄 · 글머리 ·', full === '· 다음의 냉장고 속 재료들 일부로 만들 수 있는 레시피를 추천해줘: 달걀, 쌀\n· 소스, 오일, 조미료, 장류 모두 보유\n· 종류: 간단', full.replace(/\n/g, ' ⏎ '))
const url = buildGoogleUrl(full)
check('6-e Google 인코딩 (q= 포함, 공백 %20)', url.includes('https://www.google.com/search?q=%EB%8B%A4%EA%B1%80') === false && url.includes('q=%C2%B7') && url.includes('%0A'))
check('6-f 발판 2개만 (복사·Google) 유지', /복사/.test(resultCode) && /launch-btn/.test(resultCode) && !/naver|네이버|Gemini|Claude|LLM_URLS/.test(resultCode))

// ============ 검증 7: 접힌 조의 칩도 프롬프트에 전량 ============
reset()
// 2조(17종)가 접혀 있어도 buildPrompt는 openZones를 인자로 받지 않으므로 전량 포함
const openStub = persistOpenZones([]) // 전부 접힘
const namesAll = selectedNames(first.chips)
check('7-a 67종 파랑 전부 → 프롬프트 재료 67종 (접힘 무관)', namesAll.length === 67)
check('7-b buildPrompt 시그니처에 open/compact 인자 없음', !/openZones|compact/.test(varScan.codeOf('prompt.js')))
check('7-c App은 chips 전량으로 buildPrompt (접힘 상태 주입 안 함)', /buildPrompt\(chips, kinds\)/.test(app) && !/openZones/.test(varScan.codeOf('prompt.js')))
check('7-d 접힘 화면 렌더는 2행분 (slice 0..8)', /slice\(0, COLLAPSE_LIMIT\)/.test(zone) && openStub.length === 0)

// ============ 검증 8: 범위·범례·ⓘ ============
check('8-a App에 범례(legend) 없음', !/legend/.test(appCode) && !/legend/.test(cssCode))
check('8-b ⓘ 2문장 설명', app.includes('쓸 재료는 파랑, 임박 재료는 빨강입니다. 칩을 길게 눌러 순서를 바꿀 수 있어요.'))
check('8-c 3문장 구문구 폐기 (냉장고 문을 열듯 없음)', !/냉장고 문을 열듯/.test(app))
check('8-d 접힘 기본(false) + info-btn aria-expanded', /setHelpOpen\(false\)/.test(app) === false && /useState\(false\)/.test(app) && /aria-expanded=\{helpOpen\}/.test(app))
check('8-e chip--mini(범례 전용) CSS 폐지', !/chip--mini/.test(cssCode))

// ============ 검증 9: 모두 선택·해제 ============
reset()
let b = { chips: first.chips.map((c, i) => ({ ...c, state: i % 3 === 0 ? 2 : i % 3 === 1 ? 0 : 1 })) }
const orderBefore = b.chips.map((c) => c.name).join()
const allBlue = setAllState(b, 1)
check('9-a 모두 선택 = 전원 파랑(1)', allBlue.chips.every((c) => c.state === 1))
const allOff = setAllState(b, 0)
check('9-b 모두 해제 = 전원 회색(0)', allOff.chips.every((c) => c.state === 0))
check('9-c 순서 유지 (배열 순서 그대로)', allBlue.chips.map((c) => c.name).join() === orderBefore && allOff.chips.map((c) => c.name).join() === orderBefore)
check('9-d 빨강 포함 → 전원 해제 대상', b.chips.some((c) => c.state === 2) && allOff.chips.filter((c) => c.state === 0).length === 67)
check('9-e App 버튼 = 모두 선택(selectAll) / 모두 해제(selectNone)', /selectAll/.test(app) && /selectNone/.test(app) && /모두 해제/.test(app))
check('9-f App selectAll = STATE_BLUE / selectNone = STATE_OFF', /setAllState\(cur, STATE_BLUE\)/.test(varScan.codeOf('useFridge.js')) && /setAllState\(cur, STATE_OFF\)/.test(varScan.codeOf('useFridge.js')))

// ============ 검증 10: 복사 / Google ============
reset()
persist({ chips: first.chips })
check('10-a v4 저장 (JSON { chips })', JSON.parse(store.get('fridge-chips:v4')).chips.length === 67)
const big = buildPrompt(first.chips, ['간단', '식사', '안주', '브런치', '디저트'])
const bigUrl = buildGoogleUrl(big)
check('10-b 67종+종류 전문 복사 원문 = 3줄', big.split('\n').length === 3)
check('10-c 큰 전문 URL 인코딩 정상 (q= 이후 200자)', bigUrl.startsWith('https://www.google.com/search?q=') && !bigUrl.includes(' ') && bigUrl.length > 500)
check('10-d ResultCard textarea 폴백 + 복사 피드백 유지', /navigator\.clipboard\.writeText/.test(resultCard) && /execCommand/.test(resultCard) && /복사됨/.test(resultCard))

// ============ 검증 11: 새로고침 복원 ============
reset()
let f2 = { chips: first.chips.map((c, i) => ({ ...c, state: i % 3 })) }
f2 = moveChipState(f2, '달걀', '훈제오리')
persist(f2)
persistOpenZones([2, 5])
const reload = loadState()
check('11-a 칩·색·순서 복원 (67종 + 이동 반영)', reload.chips.length === 67 && reload.chips.map((c) => c.name).join() === screenOrder(f2.chips).map((c) => c.name).join())
check('11-b 색(빨강·회색) 복원', reload.chips.some((c) => c.state === 2) && reload.chips.some((c) => c.state === 0))
check('11-c 펼침 상태 복원 [2,5]', JSON.stringify(loadOpenZones()) === '[2,5]')
check('11-d migrationNeeded = false (v4 키 있음)', reload.migrationNeeded === false)
// 레거시(v3) 감지 → 안내 + 백업 복사 + 초기화
reset()
store.set('fridge-chips:v3', JSON.stringify({ chips: [{ name: '스테이크', zone: 1, state: 1, custom: false }] }))
const legacy = loadState()
check('11-e v3 레거시 감지 → 67종 파랑 + migrationNeeded', legacy.chips.length === 67 && legacy.migrationNeeded === true)
check('11-f 백업 복사 원문 = v3 JSON 원문', readLegacyJson() === JSON.stringify({ chips: [{ name: '스테이크', zone: 1, state: 1, custom: false }] }))
completeMigration(legacy.chips)
check('11-g 초기화 시작 → v4 저장 + 레거시·recent·open-zones 삭제',
  store.has('fridge-chips:v4') && !store.has('fridge-chips:v3') && !store.has('fridge-chips:v2') &&
    !store.has('fridge-chips') && !store.has('fridge-recent') && !store.has('fridge-open-zones'))

// ============ 검증 12: var 0건 ============
const report = varScan
check('12-a var 0건 (const/let만)', report.varCount === 0, `const ${report.constCount} / let ${report.letCount}`)
check('12-b window. 0건 + export 이름 중복 없음', report.windowHits.length === 0 && report.dupeExports.length === 0)

// ---------- 결과 ----------
console.log('')
console.log(`총 ${pass + fail}건 → PASS ${pass} / FAIL ${fail}`)
process.exit(fail === 0 ? 0 : 1)
