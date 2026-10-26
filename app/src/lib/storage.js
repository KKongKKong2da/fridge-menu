// ============================================================
// lib/storage.js — 순수 저장 로직 (React 없이 검증 가능)
// M1: 기본 38종 / x 삭제 / + 추가(중복 방지) / recent / 파손 복구
// M2: 색 사이클(0->1->2->0) + 최근바 클릭 생성
// M3: 드래그 정렬 (검증 13) — 블록 모델
//   화면 = [조 헤더 + 그 조 칩들] 블록의 나열.
//   * 조 헤더 드래그 = 블록 통째 swap/이동 (조 순서 변경, 내부 순서 보존)
//   * 칩 -> 헤더   = 그 조 선두로 이관 (조 이관)
//   * 칩 -> 칩     = over 위치로 이동 (조 경계 넘으면 조 이관)
//   - moveByDragState(state, activeId, overId): DragEnd -> 새 flat
//   - renderItems(chips): dnd items = [헤더id, 칩이름 ...] 플랫
//     (custom 헤더는 조가 사라지지 않게 항상 마지막에 배치 — 명세서 3절 규칙)
//   - SENSOR_OPTIONS: Mouse(6px)/Touch(450ms,8px)/Keyboard (제스처 분리)
// 저장 키: fridge-chips 1개 (flat 배열 = 화면 순서 = 프롬프트 나열 순서)
// ============================================================
import { DEFAULT_MATERIALS } from '../data/materials.js'

export const STORAGE_KEY = 'fridge-chips'
export const RECENT_MAX = 6
export const ZONE_ID = (zone) => `zone:${zone}`
export const zoneOfId = (id) => (String(id).startsWith('zone:') ? String(id).slice(5) : null)

export function makeDefaultChips() {
  return DEFAULT_MATERIALS.map((m) => ({
    name: m.name,
    zone: m.zone,
    state: 0,
    custom: false,
  }))
}

export function normalizeName(text) {
  return (text || '').trim().replace(/\s+/g, ' ')
}

// 구조 검증: 하나라도 걸리면 null -> 파손 처리(기본 38종 초기화)
export function sanitize(raw) {
  if (!raw || typeof raw !== 'object') return null
  if (!Array.isArray(raw.chips) || !Array.isArray(raw.recent)) return null

  const validChip = (c) =>
    c &&
    typeof c.name === 'string' && c.name.trim() !== '' &&
    (c.zone === 1 || c.zone === 2 || c.zone === 3 || c.zone === 'custom') &&
    Number.isInteger(c.state) && c.state >= 0 && c.state <= 2 &&
    typeof c.custom === 'boolean'
  const validRecent = (r) => typeof r === 'string' && r.trim() !== ''

  const chips = raw.chips.filter(validChip)
  const recent = raw.recent.filter(validRecent)
  if (chips.length !== raw.chips.length) return null
  if (recent.length !== raw.recent.length) return null
  // 화면 key / dnd id가 name이므로 칩 이름 중복은 성립 불가 -> 전체 파손 간주
  if (new Set(chips.map((c) => c.name)).size !== chips.length) return null

  return { chips, recent: recent.slice(0, RECENT_MAX) }
}

export function loadState(ls) {
  const fresh = () => ({ chips: makeDefaultChips(), recent: [] })
  try {
    const stored = ls.getItem(STORAGE_KEY)
    if (stored === null) {
      const s = fresh()
      ls.setItem(STORAGE_KEY, JSON.stringify(s))
      return s
    }
    const parsed = sanitize(JSON.parse(stored))
    if (!parsed) {
      const s = fresh()
      ls.setItem(STORAGE_KEY, JSON.stringify(s))
      return s
    }
    return parsed
  } catch {
    const s = fresh()
    try { ls.setItem(STORAGE_KEY, JSON.stringify(s)) } catch { /* 시크릿 모드 등 */ }
    return s
  }
}

export function persist(ls, state) {
  try { ls.setItem(STORAGE_KEY, JSON.stringify(state)) } catch { /* 쓰기 실패 무시 */ }
  return state
}

// x 삭제 (검증 2)
export function removeChipState(state, name) {
  return { ...state, chips: state.chips.filter((c) => c.name !== name) }
}

// + Enter 추가 (검증 3, 5): 중복 방지 + recent 갱신(최신 앞, 중복 제거, 6개)
// 화면 정합: 그 조의 마지막 칩 뒤(블록 끝)에 삽입 (custom은 전체 맨 뒤)
export function addChipState(state, rawName, zone) {
  const name = normalizeName(rawName)
  if (name === '') return { state, result: 'empty' }
  if (state.chips.some((c) => c.name === name)) {
    return { state, result: 'duplicate' } // 기존 칩만 유지 (검증 5)
  }
  const chip = { name, zone, state: 0, custom: zone === 'custom' }
  const lastIdx = state.chips.map((c) => c.zone).lastIndexOf(zone)
  const chips = [...state.chips]
  chips.splice(lastIdx >= 0 ? lastIdx + 1 : chips.length, 0, chip)
  const recent = [name, ...state.recent.filter((r) => r !== name)].slice(0, RECENT_MAX)
  return { state: { ...state, chips, recent }, result: 'added' }
}

// M2 검증 7: 클릭 사이클 0 -> 1 -> 2 -> 0
export function cycleChipState(state, name) {
  return {
    ...state,
    chips: state.chips.map((c) => (c.name === name ? { ...c, state: (c.state + 1) % 3 } : c)),
  }
}

// 최근바 클릭 시 칩이 들어갈 조: 기본 재료는 본연의 조, 그 외는 "custom"
export function resolveRecentZone(name) {
  const d = DEFAULT_MATERIALS.find((m) => m.name === name)
  return d ? d.zone : 'custom'
}

// M2 검증 6: 최근바 클릭 = 타이핑 없이 즉시 칩 생성 + recent 갱신
export function pickRecentState(state, rawName) {
  const name = normalizeName(rawName)
  if (name === '') return { state, result: 'empty' }

  const bump = (arr) => [name, ...arr.filter((r) => r !== name)].slice(0, RECENT_MAX)

  if (state.chips.some((c) => c.name === name)) {
    return { state: { ...state, recent: bump(state.recent) }, result: 'bumped' }
  }
  const zone = resolveRecentZone(name)
  const chip = { name, zone, state: 0, custom: zone === 'custom' }
  const lastIdx = state.chips.map((c) => c.zone).lastIndexOf(zone)
  const chips = [...state.chips]
  chips.splice(lastIdx >= 0 ? lastIdx + 1 : chips.length, 0, chip)
  return { state: { ...state, chips, recent: bump(state.recent) }, result: 'added' }
}

// ============ M3: 블록 모델 (검증 13) ============
// flat 칩 -> 블록: 같은 zone의 연속 run = 1블록 (블록 순서 = flat 첫 등장 순서)
export function blocksFromFlat(chips) {
  const blocks = []
  chips.forEach((c) => {
    const last = blocks[blocks.length - 1]
    if (last && last.zone === c.zone) last.chips.push(c)
    else blocks.push({ zone: c.zone, chips: [c] })
  })
  return blocks
}

export function flatFromBlocks(blocks) {
  return blocks.flatMap((b) => b.chips)
}

// dnd SortableContext items: 블록마다 [헤더 id, 그 조 칩 이름들...]
// custom 헤더는 화면의 고정 항목(조는 사라지지 않음) — custom 블록이 없으면 마지막에 보정 삽입.
export function renderItems(chips) {
  const items = blocksFromFlat(chips).flatMap((b) => [ZONE_ID(b.zone), ...b.chips.map((c) => c.name)])
  if (!items.includes(ZONE_ID('custom'))) items.push(ZONE_ID('custom'))
  return items
}

// dnd DragEnd -> 새 flat 규칙:
//  1) 조 헤더 -> 헤더/칩 : 블록 통째로 over 블록 자리로 (조 순서 변경)
//  2) 칩 -> 헤더        : 그 조 선두로 이관 (조 이관; 빈 조는 마지막 블록 생성)
//  3) 칩 -> 칩          : over 칩 위치로 (over의 조로 이관)
//  4) 자기 자신/없는 id : 변경 없음 (안전장치)
export function moveByDragState(state, activeId, overId) {
  if (activeId == null || overId == null || activeId === overId) return state

  const blocks = blocksFromFlat(state.chips)
  const findBlock = (pred) => blocks.findIndex(pred)

  // 1) 조 헤더 드래그: 블록 전체 이동
  const activeZone = zoneOfId(activeId)
  if (activeZone !== null) {
    const from = findBlock((b) => String(b.zone) === String(activeZone))
    if (from < 0) return state
    let to =
      zoneOfId(overId) !== null
        ? findBlock((b) => String(b.zone) === String(zoneOfId(overId)))
        : findBlock((b) => b.chips.some((c) => c.name === overId))
    if (to < 0) {
      // over가 빈 custom 헤더 = 화면의 고정 항목 -> 블록 목록 마지막 자리
      if (zoneOfId(overId) === 'custom') to = blocks.length
      else return state
    }
    if (from === to) return state
    const next = [...blocks]
    const [block] = next.splice(from, 1)
    next.splice(Math.min(to, next.length), 0, block)
    return { ...state, chips: flatFromBlocks(next) }
  }

  // 2)/3) 칩 드래그
  const from = findBlock((b) => b.chips.some((c) => c.name === activeId))
  if (from < 0) return state
  const next = blocks.map((b) => ({ zone: b.zone, chips: [...b.chips] }))
  const [moved] = next[from].chips.splice(
    next[from].chips.findIndex((c) => c.name === activeId),
    1
  )
  if (next[from].chips.length === 0) next.splice(from, 1) // 빈 블록 제거(화면 헤더는 규칙으로 복원)

  const overZone = zoneOfId(overId)
  const inNext = (pred) => next.findIndex(pred)
  if (overZone !== null) {
    let target = inNext((b) => String(b.zone) === String(overZone))
    if (target < 0) {
      if (overZone !== 'custom') return state // 빈 기본 조 헤더는 화면에 없다(고정 3조+custom)
      next.push({ zone: 'custom', chips: [] }) // 빈 custom 헤더 = 화면 고정 항목 -> 마지막 블록
      target = next.length - 1
    }
    next[target].chips.unshift({ ...moved, zone: next[target].zone }) // 헤더의 조 선두
  } else {
    const target = inNext((b) => b.chips.some((c) => c.name === overId))
    if (target < 0) return state
    const pos = next[target].chips.findIndex((c) => c.name === overId)
    next[target].chips.splice(pos, 0, { ...moved, zone: next[target].zone }) // over 위치로
  }
  return { ...state, chips: flatFromBlocks(next.filter((b) => b.chips.length > 0)) }
}

// 센서 활성화 조건 (명세서 5절 제스처 분리):
// - Mouse: 6px 이상 움직여야 드래그 -> 짧은 클릭은 색상 사이클로 통과
// - Touch: 450ms 누름 + 8px 이내 유지 -> 탭(짧은 클릭)은 사이클, 길게 누름은 드래그
// - Keyboard: Space/Enter로 시작 후 화살표로 이동 (접근성)
export const SENSOR_OPTIONS = {
  mouse: { activationConstraint: { distance: 6 } },
  touch: { activationConstraint: { delay: 450, tolerance: 8 } },
  keyboard: {},
}
