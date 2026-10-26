// M1 검증 케이스 1, 2, 3, 5, 14, 15 를 React 없이 lib/storage.js 순수 함수로 시뮬레이션
// 실행: node ..\verify\m1-logic-test.mjs  (fridge-menu 폴더에서)
import {
  STORAGE_KEY,
  loadState,
  persist,
  removeChipState,
  addChipState,
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

// 케이스 1: 첫 실행 = 38종 검정
{
  const ls = mkLS()
  const s = loadState(ls)
  const byZone = { 1: 0, 2: 0, 3: 0 }
  s.chips.forEach((c) => (byZone[c.zone] += 1))
  const allZero = s.chips.every((c) => c.state === 0 && c.custom === false)
  const saved = JSON.parse(ls.getItem(STORAGE_KEY)).chips.length === 38
  record(1, '첫 실행 38종',
    s.chips.length === 38 && byZone[1] === 11 && byZone[2] === 18 && byZone[3] === 9 && allZero && saved,
    `총=${s.chips.length} 1조=${byZone[1]} 2조=${byZone[2]} 3조=${byZone[3]} state0전부=${allZero} 저장=${saved}`)
}

// 케이스 2: x 삭제 -> 화면+localStorage 제거
{
  const ls = mkLS()
  const s = loadState(ls)
  const after = removeChipState(s, '우삼겹')
  persist(ls, after)
  const gone = !JSON.parse(ls.getItem(STORAGE_KEY)).chips.some((c) => c.name === '우삼겹')
  record(2, 'x로 삭제', after.chips.length === 37 && gone, `38->${after.chips.length} LS제거=${gone}`)
}

// 케이스 3: 삭제 후 같은 이름 재추가 -> 검정 복원
{
  const ls = mkLS()
  let s = loadState(ls)
  s = removeChipState(s, '우삼겹')
  const { state, result } = addChipState(s, '우삼겹', 1)
  const chip = state.chips.find((c) => c.name === '우삼겹')
  record(3, '삭제 후 재추가',
    result === 'added' && chip.state === 0 && chip.zone === 1 && chip.custom === false,
    `result=${result} chip=${JSON.stringify(chip)}`)
}

// 케이스 5: 기존 칩과 같은 이름 -> 중복 생성 없음
{
  const ls = mkLS()
  const s = loadState(ls)
  const { state, result } = addChipState(s, '양파', 2)
  const n = state.chips.filter((c) => c.name === '양파').length
  record(5, '중복 방지', result === 'duplicate' && n === 1, `result=${result} 양파수=${n}`)
}

// 케이스 14: 새로고침 = 삭제/추가/순서/recent 복원
{
  const ls = mkLS()
  let s = loadState(ls)
  s = removeChipState(s, '달걀')
  let r = addChipState(s, '라면', 'custom')
  r = addChipState(r.state, '우유', 'custom')
  persist(ls, r.state)
  const re = loadState(mkLS(ls._dump()))
  const ok = re.chips.length === 39 &&
    !re.chips.some((c) => c.name === '달걀') &&
    re.chips.some((c) => c.name === '라면' && c.zone === 'custom' && c.custom === true) &&
    re.recent[0] === '우유' && re.recent[1] === '라면'
  record(14, '새로고침 복원', ok, `총=${re.chips.length} recent=[${re.recent}]`)
}

// 케이스 15: localStorage 파손 -> 기본 38종
{
  const lsA = mkLS({ [STORAGE_KEY]: '{"chips": [{{{broken' })
  const a = loadState(lsA)
  const lsB = mkLS({ [STORAGE_KEY]: JSON.stringify({
    chips: [{ name: '괴물', zone: 9, state: 7, custom: 1 }], recent: ['ok'] }) })
  const b = loadState(lsB)
  const restoredA = JSON.parse(lsA.getItem(STORAGE_KEY)).chips.length === 38
  record(15, 'localStorage 파손',
    a.chips.length === 38 && restoredA && b.chips.length === 38,
    `JSON파손->${a.chips.length} LS복구=${restoredA} 구조파손->${b.chips.length}`)
}

let allPass = true
console.log('| # | 케이스 | 판정 | 근거 |')
console.log('|---|--------|------|------|')
for (const r of results) {
  allPass = allPass && r.pass
  console.log(`| ${r.id} | ${r.title} | ${r.pass ? 'PASS' : 'FAIL'} | ${r.detail} |`)
}
console.log(allPass ? 'ALL PASS' : 'SOME FAIL')
