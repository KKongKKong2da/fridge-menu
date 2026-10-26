// M3 검증 (케이스 13 계열) + M1/M2 회귀 — 블록 모델 저장 로직 시뮬레이션
// 실행: node verify\m3-logic-test.mjs  (fridge-menu 폴더에서)
import {
  STORAGE_KEY,
  loadState,
  persist,
  addChipState,
  cycleChipState,
  removeChipState,
  pickRecentState,
  renderItems,
  blocksFromFlat,
  moveByDragState,
  SENSOR_OPTIONS,
} from '../app/src/lib/storage.js'

const mkLS = (seed = {}) => {
  const store = { ...seed }
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v) },
    _dump: () => store,
  }
}

const zoneSeq = (chips) =>
  chips.map((c) => c.zone).filter((z, i, a) => a.indexOf(z) === i).join(',')

const results = []
const record = (id, title, pass, detail) => results.push({ id, title, pass, detail })

// 케이스 13-a: 칩→칩 (조 경계 넘김): 우삼겹(1조 선두) -> 양파(2조 안) 위치로
{
  const ls = mkLS()
  let s = loadState(ls)
  s = moveByDragState(s, '우삼겹', '양파')
  persist(ls, s)
  const chip = s.chips.find((c) => c.name === '우삼겹')
  const items = renderItems(s.chips)
  const iO = items.indexOf('양파')
  const iU = items.indexOf('우삼겹')
  const z1 = s.chips.filter((c) => c.zone === 1).length
  const z2 = s.chips.filter((c) => c.zone === 2).length
  const ok = chip.zone === 2 && iU === iO - 1 && z1 === 10 && z2 === 19 && s.chips.length === 38
  record('13-a', '칩→칩 (조 경계 넘김)', ok,
    `우삼겹zone=${chip.zone} 우삼겹(${iU}) 양파(${iO}) 바로앞 1조=${z1} 2조=${z2} 총=${s.chips.length}`)
}

// 케이스 13-b: 조 헤더→조 헤더 (인접 swap): 조 2 ↔ 조 3 -> 조 순서 1,3,2
{
  const ls = mkLS()
  let s = loadState(ls)
  s = moveByDragState(s, 'zone:2', 'zone:3')
  persist(ls, s)
  const re = loadState(mkLS(ls._dump())) // 새로고침 = LS에서 복원
  const blocks = blocksFromFlat(re.chips)
  const ok =
    zoneSeq(re.chips) === '1,3,2' &&
    blocks.length === 3 &&
    blocks[1].chips[0].name === '참치' &&   // 3조 블록 내부 순서 보존
    blocks[2].chips[0].name === '마늘' &&   // 2조 블록 내부 순서 보존
    blocks[1].chips.length === 9 &&
    blocks[2].chips.length === 18
  record('13-b', '조 헤더 swap (블록 통째)', ok,
    `조순서=[${zoneSeq(re.chips)}] 블록=${blocks.length} (3조선두=${blocks[1]?.chips[0]?.name} 2조선두=${blocks[2]?.chips[0]?.name})`)
}

// 케이스 13-c: 칩→빈 조 헤더: 냉동만두(custom) -> "zone:3" 헤더에 놓기
//   조 3 헤더는 3조 블록에 있으므로 3조 선두로 이관, custom 블록 소멸(빈 블록=조 유지 규칙)
{
  const ls = mkLS()
  let s = loadState(ls)
  s = addChipState(s, '냉동만두', 'custom').state
  s = moveByDragState(s, '냉동만두', 'zone:3')
  persist(ls, s)
  const chip = s.chips.find((c) => c.name === '냉동만두')
  const items = renderItems(s.chips)
  const iHdr3 = items.indexOf('zone:3')
  const ok =
    chip.zone === 3 && chip.custom === true &&
    renderItems(s.chips)[iHdr3 + 1] === '냉동만두' && // 3조 헤더 바로 뒤(선두)
    s.chips.filter((c) => c.zone === 3).length === 10 &&
    !zoneSeq(s.chips).includes('custom')
  record('13-c', '칩→조 헤더 (선두 이관)', ok,
    `냉동만두 zone=${chip?.zone} custom=${chip?.custom} 3조=${s.chips.filter((c) => c.zone === 3).length}종 선두=${s.chips[items.indexOf('zone:3') - 0 - 2]?.name} 조순서=[${zoneSeq(s.chips)}]`)
}

// 케이스 13-c2: 빈 custom 조 헤더로 칩 놓기 (조 생성 시뮬): 라면을 custom 헤더에 드래그
{
  const ls = mkLS()
  let s = loadState(ls)
  s = pickRecentState(s, '라면').state
  s = removeChipState(s, '라면') // 라면을 screen에서 지우고 recent에만 남김
  const s2 = pickRecentState(s, '라면').state
  const s3 = moveByDragState(s2, '라면', 'zone:custom')
  const chip = s3.chips.find((c) => c.name === '라면')
  const items = renderItems(s3.chips)
  const iC = items.indexOf('zone:custom')
  const ok = chip.zone === 'custom' && iC >= 0 && items[items.length - 1] === '라면'
  record('13-c2', '칩→custom 헤더', ok,
    `라면 zone=${chip?.zone} items마지막=${items[items.length - 1]} 조순서=[${zoneSeq(s3.chips)}]`)
}

// 케이스 13-d: 안전장치 (self / 없는 id / 헤더->없는 칩) + 센서 옵션 구조
{
  const ls = mkLS()
  let s = loadState(ls)
  const n = s.chips.length
  s = moveByDragState(s, '우삼겹', '우삼겹')
  s = moveByDragState(s, '없는칩', '양파')
  s = moveByDragState(s, 'zone:1', '없는칩')
  s = moveByDragState(s, null, null)
  const safe = s.chips.length === n && s.chips[0].name === '우삼겹' && zoneSeq(s.chips) === '1,2,3'
  const sensors =
    SENSOR_OPTIONS.mouse?.activationConstraint?.distance === 6 &&
    SENSOR_OPTIONS.touch?.activationConstraint?.delay === 450 &&
    SENSOR_OPTIONS.touch?.activationConstraint?.tolerance === 8 &&
    !!SENSOR_OPTIONS.keyboard
  record('13-d', '안전장치 + 센서 3종', safe && sensors,
    `무변경=${safe} Mouse6px/Touch450ms8px/Keyboard=${sensors}`)
}

// 케이스 13-e: 순서 저장 -> 새로고침 복원 (검증 13 "변경된 순서는 localStorage 저장")
{
  const ls = mkLS()
  let s = loadState(ls)
  s = moveByDragState(s, '소시지', '삼겹살')   // 1조 안에서 마지막 -> 삼겹살 앞
  s = moveByDragState(s, 'zone:3', 'zone:1')  // 3조 블록 -> 1조 자리 (조 순서 3,1,2)
  persist(ls, s)
  const re = loadState(mkLS(ls._dump()))
  const items = renderItems(re.chips)
  const iSos = items.indexOf('소시지')
  const iSam = items.indexOf('삼겹살')
  const ok =
    zoneSeq(re.chips) === '3,1,2' &&
    iSos === iSam - 1 && // 소시지가 삼겹살 바로 앞
    re.chips.length === 38
  record('13-e', '이동 2종 -> LS 복원', ok,
    `조순서=[${zoneSeq(re.chips)}] 소시지(${iSos}) 삼겹살(${iSam}) 총=${re.chips.length}`)
}

// M1/M2 회귀: 사이클(7)·최근바 클릭(6)·중복(5)·x삭제(2)·파손(15)
{
  const ls = mkLS()
  let s = loadState(ls)
  const seq = []
  for (let i = 0; i < 3; i++) {
    s = cycleChipState(s, '삼겹살')
    seq.push(s.chips.find((c) => c.name === '삼겹살').state)
  }
  const dup = addChipState(s, '양파', 2).result === 'duplicate'
  s = removeChipState(s, '삼겹살')
  const removed = !s.chips.some((c) => c.name === '삼겹살')
  const lsBroken = mkLS({ [STORAGE_KEY]: 'not-json' })
  const fresh = loadState(lsBroken)
  record('M1/M2회귀', '사이클·중복·삭제·파손',
    seq.join(',') === '1,2,0' && dup && removed && fresh.chips.length === 38,
    `사이클=[${seq}] 중복=${dup} 삭제=${removed} 파손복구=${fresh.chips.length}종`)
}

let allPass = true
console.log('| # | 케이스 | 판정 | 근거 |')
console.log('|---|--------|------|------|')
for (const r of results) {
  allPass = allPass && r.pass
  console.log(`| ${r.id} | ${r.title} | ${r.pass ? 'PASS' : 'FAIL'} | ${r.detail} |`)
}
console.log(allPass ? 'ALL PASS' : 'SOME FAIL')
