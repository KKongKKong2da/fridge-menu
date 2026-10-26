// M2 검증 케이스 6, 7 (+ 4 일부) — 저장 로직 시뮬레이션
// 실행: node verify\m2-logic-test.mjs  (fridge-menu 폴더에서)
import {
  STORAGE_KEY,
  loadState,
  persist,
  addChipState,
  cycleChipState,
  pickRecentState,
  removeChipState,
} from '../app/src/lib/storage.js'

const mkLS = (seed = {}) => {
  const store = { ...seed }
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v) },
    _dump: () => store,
  }
}

const results = []
const record = (id, title, pass, detail) => results.push({ id, title, pass, detail })

// 케이스 7: 클릭 3회 = 검정 -> 파랑 -> 빨강 -> 검정 순환
{
  const ls = mkLS()
  let s = loadState(ls)
  const seq = []
  s = cycleChipState(s, '삼겹살'); seq.push(s.chips.find((c) => c.name === '삼겹살').state)
  s = cycleChipState(s, '삼겹살'); seq.push(s.chips.find((c) => c.name === '삼겹살').state)
  s = cycleChipState(s, '삼겹살'); seq.push(s.chips.find((c) => c.name === '삼겹살').state)
  persist(ls, s)
  const saved = JSON.parse(ls.getItem(STORAGE_KEY)).chips.find((c) => c.name === '삼겹살').state
  record(7, '클릭 3회 순환', seq.join(',') === '1,2,0' && saved === 0,
    `사이클=[${seq}] LS저장=${saved}`)
}

// 케이스 6: 최근바 클릭 = 타이핑 없이 즉시 칩 생성 + recent 갱신
{
  const ls = mkLS()
  // recent에 라면(직접입력, 칩은 삭제된 상태)·배(기본 재료 삭제됨)·달걀(이미 존재) 준비
  let s = loadState(ls)
  s = removeChipState(s, '배')
  s = addChipState(s, '라면', 'custom').state
  s = removeChipState(s, '라면') // 라면 칩은 없애고 recent에만 남김 (클릭 생성 시나리오)
  persist(ls, { ...s, recent: ['달걀', '배', '라면'] })
  const ls2 = mkLS(ls._dump())
  let cur = loadState(ls2)

  // (a) 라면 클릭: 칩 없으면 -> custom 조로 생성
  const a = pickRecentState(cur, '라면')
  const aChip = a.state.chips.find((c) => c.name === '라면')
  // (b) 배 클릭: 삭제된 기본 재료 -> 원래 조(2)로 복원
  const b = pickRecentState(a.state, '배')
  const bChip = b.state.chips.find((c) => c.name === '배')
  // (c) 달걀 클릭: 이미 칩 존재 -> 중복 생성 없음, recent만 최신 앞
  const c = pickRecentState(b.state, '달걀')
  const eggCount = c.state.chips.filter((x) => x.name === '달걀').length
  const ok =
    a.result === 'added' && aChip.zone === 'custom' && aChip.custom === true && aChip.state === 0 &&
    b.result === 'added' && bChip.zone === 2 && bChip.custom === false &&
    c.result === 'bumped' && eggCount === 1 && c.state.recent[0] === '달걀'
  record(6, '최근바 클릭', ok,
    `라면=${a.result}(${aChip?.zone}) 배=${b.result}(${bChip?.zone}) 달걀=${c.result}(칩${eggCount}개) recent=[${c.state.recent}]`)
}

// 케이스 4 (일부): +(기타) 직접입력 재료도 색 사이클·x 동일 적용 (드래그는 M3)
{
  const ls = mkLS()
  let s = loadState(ls)
  s = addChipState(s, '냉동만두', 'custom').state
  s = cycleChipState(s, '냉동만두') // 파랑
  s = cycleChipState(s, '냉동만두') // 빨강
  const redState = s.chips.find((c) => c.name === '냉동만두').state
  s = removeChipState(s, '냉동만두') // x
  const gone = !s.chips.some((c) => c.name === '냉동만두')
  record(4, '직접입력 칩 규칙', redState === 2 && gone,
    `냉동만두 state2=${redState === 2} x삭제=${gone} (드래그는 M3 확인)`)
}

// M1 회귀: 케이스 15 (파손 -> 38종)이 사이클 추가 후에도 유지되는지
{
  const lsA = mkLS({ [STORAGE_KEY]: '{"chips": [{"name":"우삼겹","zone":1,"state":5,"custom":false}], "recent": []' })
  const a = loadState(lsA)
  record('15-R', '회귀: 파손 초기화', a.chips.length === 38 && a.chips.every((c) => c.state === 0),
    `총=${a.chips.length} 전부state0=${a.chips.every((c) => c.state === 0)}`)
}

let allPass = true
console.log('| # | 케이스 | 판정 | 근거 |')
console.log('|---|--------|------|------|')
for (const r of results) {
  allPass = allPass && r.pass
  console.log(`| ${r.id} | ${r.title} | ${r.pass ? 'PASS' : 'FAIL'} | ${r.detail} |`)
}
console.log(allPass ? 'ALL PASS' : 'SOME FAIL')
