// ============================================================
// lib/storage.js — 순수 저장 로직 (React 없이 검증 가능) — v1.4
// v1.4 규칙 (명세 1·3·4·5·6절):
//   - 저장 키 fridge-chips:v4 (버전 bump), 값은 { chips: [...] } 뿐
//   - chips 배열 순서 = 화면 순서 = 프롬프트 재료 나열 순서 (단일 소스)
//   - 상태: 1 파랑(기본) / 2 빨강(임박) / 0 회색(후보 제외)  ← 값 0 유지, 표기만 회색
//   - 사이클: 파랑→빨강→회색→파랑  ((state+1)%3)
//   - 드래그 (v1.4 축소): moveChipState = 조 안 정렬만.
//       조 간 이동(크로스드롭·zone 변경)·빈 조 droppable(dropIntoEmptyZone) 코드 제거.
//       다른 조 칩 위에 드롭하면 아무 이동도 하지 않는다 (zone 값 유지 — 검증 4).
//   - 접기/펼치기 (v1.4 신설, 명세 5절): 펼친 조 번호 배열을 fridge-open-zones에 저장.
//       기본 = [] (전부 접힘). 640px 이하에서만 발동 (화면 판정은 화면 측).
//       프롬프트 나열은 접힘과 무관: chips 배열 그대로 사용 (저장 로직과 분리).
//   - 일괄 버튼: chips 배열 순서 그대로 두고 state만 변경
//       모두 선택 = 전부 1 / 모두 해제 = 전부 0 (빨강 포함)
//   - 추가(각 조 끝 +): 입력한 조의 칩이 된다. 중복 이름 금지, 그 조의 마지막 뒤, 파랑.
//   - 디폴트: 7개 조 67종 전부 파랑 (materials.js)
//   - 마이그레이션(3절): 신규 키(v4) 없고 레거시 키(v1~v3) 있으면 → 67종 파랑 + 안내
//       completeMigration(초기화 시작): v4 저장 + 레거시 키·recent 잔존·fridge-open-zones 삭제
//       파손 데이터는 안내 없이 67종 파랑 초기화
// ============================================================
import { DEFAULT_MATERIALS, ZONE_ORDER, STATE_BLUE, STATE_RED, STATE_OFF } from '../data/materials.js'

export const STORAGE_KEY = 'fridge-chips:v4'
export const LEGACY_KEYS = ['fridge-chips', 'fridge-chips:v2', 'fridge-chips:v3'] // v1.3 이하 백업 대상
export const LEGACY_RECENT_KEY = 'fridge-recent' // v1.1 최근바 잔존 정리용
export const OPEN_ZONES_KEY = 'fridge-open-zones' // v1.4: 펼친 조 번호 배열

export function makeDefaultChips() {
  return DEFAULT_MATERIALS.map((m) => ({
    name: m.name,
    zone: m.zone,
    state: STATE_BLUE, // 첫 실행 색 = 파랑 (전부)
    custom: false,
  }))
}

export function normalizeName(text) {
  return (text || '').trim().replace(/\s+/g, ' ')
}

// zone 정규화: 숫자 1~7, v1.1 레거시 문자열 'custom' → 7(냉동·기타)
function normalizeZone(zone) {
  if (zone === 'custom') return 7
  const z = Number(zone)
  return ZONE_ORDER.includes(z) ? z : null
}

// 칩 1개 검증. 하나라도 걸리면 전체 파손으로 간주 → 기본 67종 파랑 초기화
function sanitizeChip(raw) {
  if (!raw || typeof raw !== 'object') return null
  const name = normalizeName(raw.name)
  const zone = normalizeZone(raw.zone)
  const state = Number(raw.state)
  if (!name || zone === null) return null
  if (![STATE_OFF, STATE_BLUE, STATE_RED].includes(state)) return null
  return { name, zone, state, custom: raw.custom === true }
}

// 저장 문자열 → 상태 (검증 11 복원)
// 반환: { chips, migrationNeeded } — migrationNeeded = v4 키 없고 레거시 키 존재
export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const data = JSON.parse(raw)
      if (!data || !Array.isArray(data.chips)) return { chips: makeDefaultChips(), migrationNeeded: false }
      const chips = []
      for (const c of data.chips) {
        const chip = sanitizeChip(c)
        if (!chip) return { chips: makeDefaultChips(), migrationNeeded: false } // 부분 파손도 전체 초기화
        chips.push(chip)
      }
      return { chips, migrationNeeded: false }
    }
    // v4 키 없음 = 첫 실행 또는 v1.3 이하 사용자 → 67종 파랑 + (레거시 있으면) 안내
    const hasLegacy = LEGACY_KEYS.some((k) => localStorage.getItem(k))
    return { chips: makeDefaultChips(), migrationNeeded: hasLegacy }
  } catch {
    return { chips: makeDefaultChips(), migrationNeeded: false }
  }
}

// 저장: { chips }만 쓴다
export function persist(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ chips: state.chips }))
  return state
}

// 백업 복사용: 레거시 저장 원문 (v1.3 chips JSON). 없으면 null
export function readLegacyJson() {
  for (const key of LEGACY_KEYS) {
    const raw = localStorage.getItem(key)
    if (raw) return raw
  }
  return null
}

// 초기화 확인 처리 (검증 1 초기화): 67종을 v4 키에 저장하고
// 레거시 키·recent 잔존·fridge-open-zones(승인 3)를 모두 삭제
export function completeMigration(chips) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ chips }))
  for (const key of [...LEGACY_KEYS, LEGACY_RECENT_KEY, 'fridge-recent:v2', OPEN_ZONES_KEY]) {
    localStorage.removeItem(key)
  }
  return true
}

// ---------- 접기/펼치기 (검증 5·11) ----------
// fridge-open-zones: 펼친 조 번호 배열. 없으면 [] (전부 접힘 = 기본).
// 파손(배열 아님/조 번호 외 값)은 []로 복원.
export function loadOpenZones() {
  try {
    const raw = localStorage.getItem(OPEN_ZONES_KEY)
    if (!raw) return []
    const data = JSON.parse(raw)
    if (!Array.isArray(data)) return []
    return data.filter((z) => ZONE_ORDER.includes(Number(z))).map((z) => Number(z))
  } catch {
    return []
  }
}

export function persistOpenZones(zones) {
  localStorage.setItem(OPEN_ZONES_KEY, JSON.stringify(zones))
  return zones
}

// 사이클 (검증 2): 파랑(1)→빨강(2)→회색(0)→파랑(1). 위치 이동 없음.
export function cycleChipState(state, name) {
  return {
    chips: state.chips.map((c) => (c.name === name ? { ...c, state: (c.state + 1) % 3 } : c)),
  }
}

// 일괄 (검증 9): 배열 순서 그대로, state만 전부 1(모두 선택) / 전부 0(모두 해제)
export function setAllState(state, target) {
  return { chips: state.chips.map((c) => ({ ...c, state: target })) }
}

// x 삭제
export function removeChipState(state, name) {
  return { chips: state.chips.filter((c) => c.name !== name) }
}

// 조 끝 + Enter 추가 (검증 8·9 관련): 입력한 조의 칩이 된다.
//   - 같은 이름 존재 시 새 칩 없이 기존 칩만 유지 (중복 방지)
//   - 새 칩은 파랑, 그 조 칩 목록 맨 뒤
export function addChipState(state, rawName, zone) {
  const name = normalizeName(rawName)
  if (!name) return { result: 'empty', state }
  if (state.chips.some((c) => c.name === name)) return { result: 'duplicate', state }
  const z = normalizeZone(zone)
  if (z === null) return { result: 'empty', state }
  const knownDefault = DEFAULT_MATERIALS.some((m) => m.name === name)
  const newChip = { name, zone: z, state: STATE_BLUE, custom: !knownDefault }
  const inZone = state.chips.filter((c) => c.zone === z)
  const rest = state.chips.filter((c) => c.zone !== z)
  // 순서 유지: 같은 조는 그 조 안에서 뒤로, 다른 조 블록은 그대로
  const out = []
  for (const zz of ZONE_ORDER) {
    if (zz === z) out.push(...inZone, newChip)
    else out.push(...rest.filter((c) => c.zone === zz))
  }
  return { result: 'added', state: { chips: out } }
}

// ---------- 드래그 정렬 (검증 3·4) — v1.4: 조 안 정렬만 ----------
// 조 번호 순서 + 조 안 화면 순서 = 플랫 인덱스의 기준 순서
function flatOrder(chips) {
  const out = []
  for (const z of ZONE_ORDER) out.push(...chips.filter((c) => c.zone === z))
  return out
}

// 칩을 같은 조 안의 targetName 자리로 옮기는 단일 구현.
// - targetName이 같은 조에 있으면: 그 칩 바로 앞(앞에서 드래그 시 뒤)에 삽입. 조 안 순서만 변경.
// - targetName이 다른 조에 있으면 (검증 4): 이동 없음 — 원본 배열 그대로 반환 (zone 값 유지).
// - targetName null (v1.3 빈 조 드롭 경로)도 더 이상 이동 없음.
export function moveChipState(state, dragName, targetName) {
  if (dragName === targetName || targetName === null) return state
  const ordered = flatOrder(state.chips)
  const fromIndex = ordered.findIndex((c) => c.name === dragName)
  const targetIndex = ordered.findIndex((c) => c.name === targetName)
  if (fromIndex === -1 || targetIndex === -1) return state
  if (ordered[fromIndex].zone !== ordered[targetIndex].zone) return state // 조 간 이동 불가
  const moved = [...ordered]
  const [chip] = moved.splice(fromIndex, 1)
  const insertAt = fromIndex < targetIndex ? targetIndex - 1 : targetIndex
  moved.splice(insertAt, 0, chip)
  return { chips: moved }
}

// 프롬프트 나열 순서 = 화면 순서 (단일 소스 확인용 검증 헬퍼)
export function screenOrder(chips) {
  return flatOrder(chips)
}
