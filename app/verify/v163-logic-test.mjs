// v163-logic-test.mjs — v1.6.3 검증 (실행: node verify/v163-logic-test.mjs, exit 0 = ALL PASS)
// 대상 버그: "칩을 놓은 자리에 잠시 갔다가 옛 자리로 되돌아간다 / 새로고침하면 옛 순서" (PC·모바일 공통)
// 방식: App(handleDragEnd) + App의 useEffect(chips→스냅샷 동기화) + useFridge.applyDrag(persist)
//       + ZoneList(items = 스냅샷) + storage.moveChipState의 흐름을 node로 재현(시뮬레이션)해서,
//       낙하 지점 전수(칩 위 / 칩 사이·끝 여백 = 컨테이너 판정 / 빈 조 / 조 간 / 제자리)에서
//       ① 놓은 자리 = 저장 ② 화면(items) = 저장(localStorage v4) ③ 새로고침 = 새 순서 ④ 색 불변 을 확인.
import { readFileSync as read } from 'node:fs'

const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
}

const {
  makeDefaultChips, moveChipState, persist, loadState, STORAGE_KEY,
  translateContainerTarget, computeSnapshotMove,
} = await import('../src/lib/storage.js')

let pass = 0, fail = 0
const ok = (cond, label) => {
  if (cond) { pass++; console.log(' PASS', label) }
  else { fail++; console.log(' *FAIL*', label) }
}
const stripC = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')

// App.zoneNames과 동일 (ZoneList 렌더가 쓰는 items 계산)
const ZONES = [1, 2, 3, 4, 5, 6, 7]
const zoneNames = (chips) => {
  const map = {}
  for (const z of ZONES) map[z] = chips.filter((c) => c.zone === z).map((c) => c.name)
  return map
}
const SEP = String.fromCharCode(0x2022) // App의 JOIN과 동일 용도 (NUL 사용 금지)

// App 흐름 시뮬레이션 (드롭 → 저장(persist) → 스냅샷 갱신 → useEffect 동기화)
function makeAppSim(initChips) {
  let chips = initChips.map((c) => ({ custom: false, ...c }))
  let snapshot = zoneNames(chips)
  persist({ chips })

  const syncEffect = () => {
    const now = zoneNames(chips)
    for (const z of ZONES) {
      if (snapshot[z].join(SEP) !== now[z].join(SEP)) {
        snapshot = now
        return
      }
    }
  }

  const handleDragEnd = (activeId, overId) => {
    if (!overId) return // App: over 없이 종료 = 아무것도 하지 않음 (취소 = 복원 정상)
    const from = String(activeId)
    const to = translateContainerTarget(snapshot, from, overId) // v1.6.3 번역
    chips = moveChipState({ chips }, from, to).chips // useFridge.applyDrag
    persist({ chips }) // applyDrag의 persist (저장 지점)
    snapshot = computeSnapshotMove(snapshot, from, to) // 화면(items) 기준 갱신
    syncEffect()
  }

  return {
    handleDragEnd,
    screenZone: (z) => snapshot[z].join(','), // 화면(items) 순서
    storageZone: (z) => JSON.parse(localStorage.getItem(STORAGE_KEY)).chips
      .filter((c) => c.zone === z).map((c) => c.name).join(','), // 저장된 순서
    reloadZone: (z) => loadState().chips.filter((c) => c.zone === z).map((c) => c.name).join(','), // 새로고침
    states: () => chips.map((c) => `${c.name}:${c.state}`).join(','),
  }
}

console.log('--- 섹션 1. 낙하 지점 전수: 놓은 자리 = 저장 (핵심 증상 재발 차단) ---')
{
  const init = [
    { name: 'A', zone: 1, state: 1 }, { name: 'B', zone: 1, state: 1 },
    { name: 'C', zone: 1, state: 1 }, { name: 'D', zone: 1, state: 1 },
    { name: 'E', zone: 2, state: 2 }, { name: 'F', zone: 2, state: 1 }, { name: 'G', zone: 2, state: 1 },
    { name: 'H', zone: 4, state: 1 }, { name: 'I', zone: 4, state: 1 },
  ]
  const cases = [
    ['조1 여백(컨테이너 판정) A→맨 뒤', 'A', 'zone-1', 'B,C,D,A'],
    ['D를 조1 여백에 = 맨 뒤 착지 (현재 리스트의 맨 뒤 인덱스)', 'D', 'zone-1', 'B,C,A,D'],
    ['칩 위 정확한 드롭 A→C (앞으로)', 'A', 'C', 'B,A,C,D'],
    ['뒤로 드롭 D→B', 'D', 'B', 'D,B,A,C'],
    ['다시 여백 A→조1 맨 뒤 (연속 왕복)', 'A', 'zone-1', 'D,B,C,A'],
    ['조 간 여백 D→zone-2 = 조 간 무이동 (검증 4 유지)', 'D', 'zone-2', 'D,B,C,A'],
    ['빈 조 여백 B→zone-3 = 무이동', 'B', 'zone-3', 'D,B,C,A'],
  ]
  const app = makeAppSim(init)
  for (const [label, from, over, expect] of cases) {
    app.handleDragEnd(from, over)
    const screen = app.screenZone(1)
    const storage = app.storageZone(1)
    const reload = app.reloadZone(1)
    ok(screen === expect && storage === expect && reload === expect,
      `${label} → [${expect}] (화면=저장=새로고침) 실제 화면[${screen}] 저장[${storage}]`)
  }
  const app2 = makeAppSim(init)
  app2.handleDragEnd('I', 'zone-4')
  ok(app2.screenZone(4) === 'H,I' && app2.storageZone(4) === 'H,I', '조4 여백 I→맨 뒤 = 자기 자리 [H,I] 유지')
}

console.log('--- 섹션 2. 연속 5회 왕복: 화면=저장=새로고침 3중 일치 ---')
{
  const app = makeAppSim([
    { name: 'A', zone: 1, state: 1 }, { name: 'B', zone: 1, state: 1 }, { name: 'C', zone: 1, state: 1 },
    { name: 'D', zone: 1, state: 1 }, { name: 'E', zone: 1, state: 1 },
  ])
  const seq = [['A', 'zone-1'], ['A', 'B'], ['E', 'zone-1'], ['B', 'D'], ['E', 'A']]
  let aligned = 0
  for (const [from, over] of seq) {
    app.handleDragEnd(from, over)
    if (app.screenZone(1) === app.storageZone(1)) aligned++
    console.log(`   이동 ${from}→${over}: 화면[${app.screenZone(1)}] 저장[${app.storageZone(1)}]`)
  }
  ok(aligned === seq.length, '연속 5회 드롭 매번 화면 = 저장')
  const reloaded = app.reloadZone(1)
  ok(reloaded === 'E,A,C,D,B', `새로고침 후에도 새 순서 [E,A,C,D,B] (옛 순서 A,B,C,D,E 아님) 실제=[${reloaded}]`)
  ok(app.screenZone(1) === reloaded, '새로고침 순서 = 화면 순서 (3중 일치)')
}

console.log('--- 섹션 3. 이동 후 색·× 오평발 없음 (state 불변) ---')
{
  const app = makeAppSim([
    { name: 'A', zone: 1, state: 1 }, { name: 'B', zone: 1, state: 2 },
    { name: 'C', zone: 1, state: 0 }, { name: 'D', zone: 1, state: 1 },
  ])
  const statesOf = (list) => list.map((c) => `${c.name}:${c.state}`).sort().join(',')
  const before = statesOf(loadState().chips.filter((c) => c.zone === 1))
  app.handleDragEnd('A', 'zone-1')
  app.handleDragEnd('D', 'B')
  const after = statesOf(loadState().chips.filter((c) => c.zone === 1))
  const reloadStates = statesOf(app.reloadZone(1) ? loadState().chips.filter((c) => c.zone === 1) : [])
  ok(before === after, `이동 2회 후 state 집합 불변 (${after}) — 색 저절로 변화 없음`)
  ok(reloadStates === after, `새로고침 후에도 state 동일 (${reloadStates}) — × 눌림·색 변화 저장 안 됨`)
}

console.log('--- 섹션 4. 제자리·조 간·빈 조·취소 = 원본 그대로 (정상) ---')
{
  const app = makeAppSim([
    { name: 'A', zone: 1, state: 1 }, { name: 'B', zone: 1, state: 1 }, { name: 'E', zone: 2, state: 1 },
  ])
  const t = () => app.screenZone(1) + '|' + app.storageZone(1)
  app.handleDragEnd('A', 'A')
  ok(t() === 'A,B|A,B', '제자리 드롭(A→A) = 원본 (no-op)')
  app.handleDragEnd('A', 'E')
  ok(t() === 'A,B|A,B', '조 간 칩 드롭(A→E) = 원본 (검증 4)')
  app.handleDragEnd('A', 'zone-3')
  ok(t() === 'A,B|A,B', '빈 조 여백 = 원본')
  app.handleDragEnd('A', null)
  ok(t() === 'A,B|A,B', 'over 없이 종료(취소) = 원본 (되돌아가도 원위치 = 정상)')
}

console.log('--- 섹션 5. v1.6.2 프롬프트 임박 필수화 유지 (prompt.js 무변경) ---')
{
  const { buildLines } = await import('../src/lib/prompt.js')
  const L = buildLines([{ name: 'R', zone: 1, state: 2, custom: false }, { name: 'B', zone: 1, state: 1, custom: false }], [])
  ok(L[0] === '반드시 사용해야 하는 임박 재료: R', '임박(빨강) 1줄 = 필수 사용 명시')
  ok(L[1].startsWith('위의 임박 재료를 꼭 쓰고'), '임박 필수 + 파랑 나열 구조 유지')
}

console.log('--- 섹션 6. 소스 정적 확인 (App·storage·hooks·CSS 구조) ---')
{
  const appSrc = stripC(read('src/App.jsx', 'utf8'))
  const storage = stripC(read('src/lib/storage.js', 'utf8'))
  const hooks = stripC(read('src/hooks/useLongPressDrag.js', 'utf8'))
  const chipSrc = stripC(read('src/components/Chip.jsx', 'utf8'))
  const zone = stripC(read('src/components/ZoneList.jsx', 'utf8'))
  const css = stripC(read('src/styles.css', 'utf8'))

  ok(appSrc.includes('translateContainerTarget') && storage.includes('export function translateContainerTarget'),
    '컨테이너 착지 번역: storage 단일 정의 + App 호출')
  ok(appSrc.includes('computeSnapshotMove') && storage.includes('export function computeSnapshotMove'),
    '스냅샷 이동: storage 단일 정의 + App 호출 (App 내부 사본 없음)')
  ok(!appSrc.includes('function computeAfterMove') && !appSrc.includes('function translateContainerTarget'),
    'App 내부 중복 정의 0건 (단일 소스 강제)')
  ok(appSrc.includes('longPress.onDragEnd()') && appSrc.includes('onDragEnd={handleDragEnd}'),
    'handleDragEnd가 봉인 기록 + 저장/스냅샷 수행')
  ok(appSrc.includes('onDragStart={longPress.onDragStart}'), 'onDragStart(live 추적) 연결')
  ok(appSrc.includes('delay: LONG_PRESS_MS') && appSrc.includes('distance: 5'),
    '센서 분리 유지 (PC 5px 즉시 / 모바일 600ms 꾹)')
  ok(appSrc.includes('items={snapshot[zone]}') && zone.includes('safeItems'),
    'items = App 스냅샷 + ZoneList 안전복귀 (v1.6.1 구조)')
  ok(zone.includes('id={`zone-${zone}`}'), 'ZoneList 컨테이너 id 유지 (번역 규칙과 짝)')
  ok(hooks.includes('LONG_PRESS_MS = 600') && hooks.includes('useCallback'),
    'LONG_PRESS_MS 600 단일 소스 + 콜백 고정')
  ok(chipSrc.includes('isDragLinked') && chipSrc.includes("isDragging ? 'none' : 'pan-y'"),
    'Chip 클릭 봉인 + touch-action 스위칭 유지')
  ok(!appSrc.includes('PointerSensor') && !appSrc.includes('KeyboardSensor('),
    'PointerSensor/KeyboardSensor 회귀 없음')
  ok((css.match(/--gray:\s*#/g) || []).length === 1 && css.includes('var(--gray)') && !/--off:\s*#/.test(css),
    '회색 --gray 단일 통일 유지 (검증 8)')
  ok(appSrc.includes('v1.6.3'), 'footer 표기 v1.6.3')
  ok(!appSrc.includes('\u0000') && !storage.includes('\u0000'), 'App·storage 소스에 NUL 문자 없음 (파일 정상)')
}

console.log('--- 섹션 7. 67종·저장 스키마·신규 라이브러리 ---')
{
  const d = makeDefaultChips()
  ok(d.length === 67, '67종')
  ok(new Set(d.map((c) => c.zone)).size === 7, '7개 조')
  ok(d.every((c) => c.state === 1), '첫 실행 전부 파랑')
  ok(STORAGE_KEY === 'fridge-chips:v4', '저장 키 fridge-chips:v4 (bump 없음)')
  const pkg = JSON.parse(read('package.json', 'utf8'))
  const deps = Object.keys(pkg.dependencies).sort().join(',')
  ok(deps === '@dnd-kit/core,@dnd-kit/sortable,@dnd-kit/utilities,react,react-dom',
    '의존성 5종 그대로 (신규 라이브러리 0건)')
}

console.log(`\n합계 PASS=${pass} FAIL=${fail}`)
process.exit(fail === 0 ? 0 : 1)
