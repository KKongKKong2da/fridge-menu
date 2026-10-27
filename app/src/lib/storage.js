// ============================================================
// lib/storage.js — 순수 저장 로직 (React 없이 검증 가능) — v1.2
// v1.2 규칙 (명세 3·8절):
//   - 저장 키 fridge-chips 1개, 값은 { chips: [...] } 뿐 (recent 키 폐지)
//   - chips 배열은 "조 번호순(1→2→3→4)로 묶인 플랫 배열" = 화면 순서 = 프롬프트 나열 순서
//     (드래그 폐기 → 조 순서는 1~4 고정, 조 안 순서만 상태 전이로 움직임)
//   - 상태: 1 파랑(기본) / 2 빨강(임박+최우선) / 0 검정(후보 제외)
//   - 사이클: 파랑→빨강→검정→파랑  ((state+1)%3)
//   - 조 단위 자동 이동 (v1.2 확정, 승인 1):
//       빨강이 되면: 그 조 최선두 (최근 빨강이 가장 앞)
//       검정이 되면: 그 조 최후미 (최근 검정이 가장 뒤)
//       파랑이 되면: 위치 그대로
//   - 일괄 버튼 (v1.2 신설, 승인 2): chips 배열 순서 그대로 두고 state만 변경
//       모두 선택 = 전부 1 / 모두 해제 = 전부 0 (빨강 포함)
//   - 첫 실행/파손: 기본 38종 전부 파랑(state 1)으로 초기화 (기타 조는 빈 조)
//   - v1.1 드래그 코드(moveByDragState/blocksFromFlat/renderItems/SENSOR_OPTIONS/ZONE_ID) 전면 제거
// ============================================================
import { DEFAULT_MATERIALS, ZONE_ORDER, STATE_BLUE, STATE_RED, STATE_OFF } from '../data/materials.js'

export const STORAGE_KEY = 'fridge-chips'

export function makeDefaultChips() {
  return DEFAULT_MATERIALS.map((m) => ({
    name: m.name,
    zone: m.zone,
    state: STATE_BLUE, // v1.2: 첫 실행 색 = 파랑
    custom: false,
  }))
}

export function normalizeName(text) {
  return (text || '').trim().replace(/\s+/g, ' ')
}

// zone 값正规化: 숫자 1~4, v1.1 레거시 문자열 'custom' → 4(기타 조)
function normalizeZone(zone) {
  if (zone === 'custom') return 4
  const z = Number(zone)
  return ZONE_ORDER.includes(z) ? z : null
}

// 칩 1개 검증. 하나라도 걸리면 전체 파손으로 간주 → 기본 38종 파랑 초기화 (검증 19)
function sanitizeChip(raw) {
  if (!raw || typeof raw !== 'object') return null
  const name = normalizeName(raw.name)
  const zone = normalizeZone(raw.zone)
  const state = Number(raw.state)
  if (!name || zone === null) return null
  if (![STATE_OFF, STATE_BLUE, STATE_RED].includes(state)) return null
  return { name, zone, state, custom: raw.custom === true }
}

// 저장 문자열 → 상태. 파손(JSON 실패/형태 불일치/칩 하나라도 무효) → 기본 39종 파랑 (검증 19)
export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { chips: makeDefaultChips() } // 첫 실행 (검증 1)
    const data = JSON.parse(raw)
    if (!data || !Array.isArray(data.chips)) return { chips: makeDefaultChips() }
    const chips = []
    for (const c of data.chips) {
      const chip = sanitizeChip(c)
      if (!chip) return { chips: makeDefaultChips() } // 부분 파손도 전체 초기화
      chips.push(chip)
    }
    return { chips }
  } catch {
    return { chips: makeDefaultChips() }
  }
}

// 저장: { chips }만 쓴다 → v1.1에 있던 recent 키는 저절로 제거 (검증 18)
export function persist(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ chips: state.chips }))
  return state
}

// 조 번호순(1→2→3→4) 정수로 정규화 — 화면/프롬프트가 항상 조 순서를 지키는 단일 소스
function sortByZone(chips) {
  const out = []
  for (const z of ZONE_ORDER) out.push(...chips.filter((c) => c.zone === z))
  return out
}

// 상태 전이 후 그 조 안에서만 이동 (조 밖 순서는 건드리지 않음) — 검증 3·4·5
function applyZoneMove(chips, name, next) {
  const chipsSorted = sortByZone(chips)
  const chip = chipsSorted.find((c) => c.name === name)
  if (!chip) return chipsSorted
  const zone = chip.zone
  const updated = { ...chip, state: next }
  const inZone = chipsSorted.filter((c) => c.zone === zone)
  const outside = chipsSorted.filter((c) => c.zone !== zone)
  const rest = inZone.filter((c) => c.name !== name)
  let moved
  if (next === STATE_RED) {
    moved = [updated, ...rest] // 빨강 = 그 조 최선두 (최근 빨강이 가장 앞)
  } else if (next === STATE_OFF) {
    moved = [...rest, updated] // 검정 = 그 조 최후미 (최근 검정이 가장 뒤)
  } else {
    moved = inZone.map((c) => (c.name === name ? updated : c)) // 파랑 = 위치 그대로
  }
  const out = []
  for (const z of ZONE_ORDER) out.push(...(z === zone ? moved : outside.filter((c) => c.zone === z)))
  return out
}

// 사이클 (검증 2): 파랑(1)→빨강(2)→검정(0)→파랑(1). 이동은 applyZoneMove가 담당
export function cycleChipState(state, name) {
  const cur = state.chips.find((c) => c.name === name)
  if (!cur) return state
  const next = (cur.state + 1) % 3
  return { chips: applyZoneMove(state.chips, name, next) }
}

// 일괄 (검증 6·7): 배열 순서 그대로, state만 전부 1 / 전부 0
export function setAllState(state, target) {
  return { chips: state.chips.map((c) => ({ ...c, state: target })) }
}

// x 삭제 (검증 10)
export function removeChipState(state, name) {
  return { chips: state.chips.filter((c) => c.name !== name) }
}

// 조 끝 + Enter 추가 (검증 8·9):
//   - 같은 이름 존재 시 새 칩 없이 기존 칩만 유지 (중복 방지)
//   - 신규는 파랑으로 그 조의 파랑 블록 마지막(검정 블록 앞)에 삽입 → 선두는 빨강·파랑이 지킴
//   - 기본 재료였던 이름이면 원래 조로, 그 외는 지정한 조(기타=4 포함)
export function addChipState(state, rawName, zone) {
  const name = normalizeName(rawName)
  if (!name) return { result: 'empty', state }
  if (state.chips.some((c) => c.name === name)) return { result: 'duplicate', state }
  let z = normalizeZone(zone)
  if (z === null) return { result: 'empty', state }
  const knownDefault = DEFAULT_MATERIALS.find((m) => m.name === name)
  if (knownDefault) z = knownDefault.zone // 삭제된 기본 재료 재추가 → 원래 조로 복원
  const newChip = { name, zone: z, state: STATE_BLUE, custom: !knownDefault }
  const inZone = state.chips.filter((c) => c.zone === z)
  const lastOn = inZone.map((c) => c.state).lastIndexOf(STATE_OFF)
  const insertAt = lastOn === -1 ? inZone.length : lastOn // 검정 블록 직전
  const moved = [...inZone.slice(0, insertAt), newChip, ...inZone.slice(insertAt)]
  const out = []
  for (const zz of ZONE_ORDER) {
    if (zz === z) out.push(...moved)
    else out.push(...state.chips.filter((c) => c.zone === zz))
  }
  return { result: 'added', state: { chips: out } }
}
