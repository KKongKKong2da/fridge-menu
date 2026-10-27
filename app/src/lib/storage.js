// ============================================================
// lib/storage.js — 순수 저장 로직 (React 없이 검증 가능) — v1.3
// v1.3 규칙 (명세 2·3·7·8절):
//   - 저장 키 fridge-chips:v3 (버전 bump), 값은 { chips: [...] } 뿐
//   - chips 배열 순서 = 화면 순서 = 프롬프트 재료 나열 순서 (단일 소스)
//   - 상태: 1 파랑(기본) / 2 빨강(임박) / 0 회색(후보 제외)  ← 구 검정 슬롯, 값 0 유지
//   - 사이클: 파랑→빨강→회색→파랑  ((state+1)%3)
//   - 자동 이동 전면 삭제: 상태 전환은 state 값만 바꾸고 위치는 움직이지 않는다.
//     (v1.2의 빨강 선두·검정 후미 코드 제거 — applyZoneMove/sortByZone 기반 로직)
//   - 드래그 정렬 (v1.3 복구): moveChipState가 순서·zone 변경의 단일 구현
//       ① 조 안 자유 정렬 ② 조 간 이동(chip.zone 변경, 드롭한 자리에 배열 삽입)
//       ③ 빈 조/조 끝 드롭 = dropIntoEmptyZone (그 조의 마지막 칩)
//   - 일괄 버튼: chips 배열 순서 그대로 두고 state만 변경
//       모두 선택 = 전부 1 / 모두 해제 = 전부 0 (빨강 포함)
//   - 추가(각 조 끝 +): 입력한 조의 칩이 된다 (v1.2 '기본 재료 원래 조 복원' 규칙 폐기)
//       중복 이름 금지, 그 조의 마지막 칩 뒤로 추가, 새 칩 색은 파랑
//   - 디폴트: 6개 조 63종 전부 파랑 (materials.js), 각 조 끝 + / +(기타) 버튼 없음
//   - 마이그레이션(8절): 신규 키 없고 레거시 키 있으면 → 63종 파랑 + 안내 표시
//       (completeMigration이 확인 처리: 신규 키 저장 + 레거시 키 삭제 + v1.1 recent 키 정리)
//       파손 데이터는 안내 없이 63종 파랑 초기화 (검증 14)
// ============================================================
import { DEFAULT_MATERIALS, ZONE_ORDER, STATE_BLUE, STATE_RED, STATE_OFF } from '../data/materials.js'

export const STORAGE_KEY = 'fridge-chips:v3'
export const LEGACY_KEYS = ['fridge-chips', 'fridge-chips:v2'] // v1.2 이하 백업 대상
export const LEGACY_RECENT_KEY = 'fridge-recent' // v1.1 최근바 잔존 정리용

export function makeDefaultChips() {
  return DEFAULT_MATERIALS.map((m) => ({
    name: m.name,
    zone: m.zone,
    state: STATE_BLUE, // v1.3: 첫 실행 색 = 파랑 (전부)
    custom: false,
  }))
}

export function normalizeName(text) {
  return (text || '').trim().replace(/\s+/g, ' ')
}

// zone 정규화: 숫자 1~6, v1.1 레거시 문자열 'custom' → 6(해산물·기타)
function normalizeZone(zone) {
  if (zone === 'custom') return 6
  const z = Number(zone)
  return ZONE_ORDER.includes(z) ? z : null
}

// 칩 1개 검증. 하나라도 걸리면 전체 파손으로 간주 → 기본 63종 파랑 초기화 (검증 14)
function sanitizeChip(raw) {
  if (!raw || typeof raw !== 'object') return null
  const name = normalizeName(raw.name)
  const zone = normalizeZone(raw.zone)
  const state = Number(raw.state)
  if (!name || zone === null) return null
  if (![STATE_OFF, STATE_BLUE, STATE_RED].includes(state)) return null
  return { name, zone, state, custom: raw.custom === true }
}

// 저장 문자열 → 상태 (검증 1·2·12·14)
// 반환: { chips, migrationNeeded } — migrationNeeded = 신규 키 없고 레거시 키 존재
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
    // 신규 키 없음 = 첫 실행 또는 구 버전 사용자 → 63종 파랑 + (레거시 있으면) 안내
    const hasLegacy = LEGACY_KEYS.some((k) => localStorage.getItem(k))
    return { chips: makeDefaultChips(), migrationNeeded: hasLegacy }
  } catch {
    return { chips: makeDefaultChips(), migrationNeeded: false }
  }
}

// 저장: { chips }만 쓴다 (v1.2 recent 키도 이 시점 이후로는 생성되지 않음)
export function persist(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ chips: state.chips }))
  return state
}

// 백업 복사용: 레거시 저장 원문 (v1.2 chips JSON). 없으면 null
export function readLegacyJson() {
  for (const key of LEGACY_KEYS) {
    const raw = localStorage.getItem(key)
    if (raw) return raw
  }
  return null
}

// 초기화 확인 처리 (검증 2): 63종을 신규 키에 저장하고 레거시·잔존 키 삭제
export function completeMigration(chips) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ chips }))
  for (const key of [...LEGACY_KEYS, LEGACY_RECENT_KEY, 'fridge-recent:v2']) {
    localStorage.removeItem(key)
  }
  return true
}

// 사이클 (검증 3): 파랑(1)→빨강(2)→회색(0)→파랑(1)
// v1.3 핵심: 위치 이동 없음. 같은 자리에서 state 값만 변경 (검증 4)
export function cycleChipState(state, name) {
  return {
    chips: state.chips.map((c) => (c.name === name ? { ...c, state: (c.state + 1) % 3 } : c)),
  }
}

// 일괄 (검증 7): 배열 순서 그대로, state만 전부 1(모두 선택) / 전부 0(모두 해제)
export function setAllState(state, target) {
  return { chips: state.chips.map((c) => ({ ...c, state: target })) }
}

// x 삭제 (검증 10)
export function removeChipState(state, name) {
  return { chips: state.chips.filter((c) => c.name !== name) }
}

// 조 끝 + Enter 추가 (검증 8·9)
//   - v1.3 규칙: 입력한 조의 칩이 된다. 기본 재료를 다시 입력해도 그 조에 들어간다.
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

// ---------- 드래그 정렬 (검증 5·6) ----------
// 조 번호 순서 + 조 안 화면 순서 = 플랫 인덱스의 기준 순서
function flatOrder(chips) {
  const out = []
  for (const z of ZONE_ORDER) out.push(...chips.filter((c) => c.zone === z))
  return out
}

// 칩을 targetIndex 위치(= flatOrder 기준 다른 칩 인덱스)로 옮기는 단일 구현.
// - 같은 조: 조 안 순서만 변경 (조 밖 순서 불변)
// - 다른 조: chip.zone = targetIndex 칩의 조로 변경, 그 칩 바로 앞에 배열 삽입
//   (빈 조 = targetIndex null → 그 조 맨 뒤)
export function moveChipState(state, dragName, targetName) {
  if (dragName === targetName) return state
  const ordered = flatOrder(state.chips)
  const targetIndex = targetName === null ? ordered.length : ordered.findIndex((c) => c.name === targetName)
  if (targetIndex === -1) return state
  const fromIndex = ordered.findIndex((c) => c.name === dragName)
  if (fromIndex === -1) return state
  const moved = [...ordered]
  const [chip] = moved.splice(fromIndex, 1)
  const insertAt = fromIndex < targetIndex ? targetIndex - 1 : targetIndex
  const target = ordered[targetIndex]
  const zone = targetName === null ? chip.zone : target.zone
  moved.splice(insertAt, 0, { ...chip, zone })
  return { chips: moved }
}

// 조 간 이동에서 "그 조가 비어 있을 때" 그 조 마지막 칩으로 드롭하는 경로 (검증 6)
export function dropIntoEmptyZone(state, dragName, zone) {
  const z = normalizeZone(zone)
  if (z === null) return state
  if (state.chips.some((c) => c.zone === z)) return state // 빈 조가 아니면 일반 드롭 처리
  const ordered = flatOrder(state.chips)
  const fromIndex = ordered.findIndex((c) => c.name === dragName)
  if (fromIndex === -1) return state
  const moved = [...ordered]
  const [chip] = moved.splice(fromIndex, 1)
  // 조 순서상 그 조 블록 끝(= 다음 조 시작 위치)에 삽입
  let insertAt = moved.length
  for (const zz of ZONE_ORDER) {
    if (zz > z) {
      insertAt = moved.findIndex((c) => c.zone === zz)
      break
    }
  }
  const at = insertAt === -1 ? moved.length : insertAt
  moved.splice(at, 0, { ...chip, zone: z })
  return { chips: moved }
}

// 프롬프트 나열 순서 = 화면 순서 (단일 소스 확인용 검증 헬퍼)
export function screenOrder(chips) {
  return flatOrder(chips)
}
