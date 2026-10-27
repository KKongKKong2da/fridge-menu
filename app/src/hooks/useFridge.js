// localStorage 'fridge-chips:v4' + 'fridge-open-zones' 를 다루는 훅 (로직은 lib/storage.js 위임) — v1.4
// v1.4 변화:
//   - openZones(펼친 조 번호 배열): loadOpenZones로 시작, toggleOpen으로 변경 + 즉시 저장 (명세 5절)
//   - applyDrag = 조 안 정렬만 (moveChipState가 조 간 이동이면 원본 반환)
//   - selectAll / selectNone = 일괄 버튼 (순서 유지, state만 변경)
//   - 마이그레이션 안내(migrationNeeded → confirmMigration): v4 키 없고 레거시(v1~v3) 있으면 표시
// kinds(종류 체크)는 화면 상태이므로 App이 들고 있고 localStorage에 저장하지 않는다 (v1.2 승인 3 유지).
import { useCallback, useState } from 'react'
import { STATE_BLUE, STATE_OFF } from '../data/materials.js'
import {
  addChipState,
  completeMigration,
  cycleChipState,
  loadOpenZones,
  loadState,
  persist,
  persistOpenZones,
  readLegacyJson,
  removeChipState,
  setAllState,
  moveChipState,
} from '../lib/storage.js'

export function useFridge() {
  const [data, setData] = useState(() => {
    const loaded = loadState()
    return { chips: loaded.chips, migrationNeeded: loaded.migrationNeeded }
  })

  // 검증 5·11: 펼친 조 번호 배열 (fridge-open-zones)
  const [openZones, setOpenZones] = useState(() => loadOpenZones())

  // 초기화 확인 (검증 1): 67종을 v4 키에 확정 저장 + 레거시·recent·open-zones 삭제 → 안내 닫힘
  // (openZones 화면 상태도 빈 배열로 리셋 — 승인 3: fridge-open-zones 초기화 대상)
  const confirmMigration = useCallback(() => {
    setData((cur) => {
      completeMigration(cur.chips)
      return { chips: cur.chips, migrationNeeded: false }
    })
    setOpenZones([])
  }, [])

  // 백업 복사용 원문 (v1.3 chips JSON) — 안내 카드에서 클립보드 복사
  const getLegacyJson = useCallback(() => readLegacyJson(), [])

  // x 삭제: 화면 + localStorage 제거
  const removeChip = useCallback((name) => {
    setData((cur) => ({ ...persist(removeChipState(cur, name)), migrationNeeded: cur.migrationNeeded }))
  }, [])

  // 조 끝 ＋ Enter 추가: 입력한 조의 칩이 된다
  const addChip = useCallback((rawName, zone) => {
    let result = 'added'
    setData((cur) => {
      const next = addChipState(cur, rawName, zone)
      result = next.result
      if (next.result !== 'added') return cur
      return { ...persist(next.state), migrationNeeded: cur.migrationNeeded }
    })
    return result
  }, [])

  // 검증 2: 칩 클릭 1회 = 파랑 -> 빨강 -> 회색 -> 파랑 순환, 위치 불변, 즉시 저장
  const cycleChip = useCallback((name) => {
    setData((cur) => ({ ...persist(cycleChipState(cur, name)), migrationNeeded: cur.migrationNeeded }))
  }, [])

  // 검증 9: 모두 선택 = 빨강 포함 모든 칩 파랑 / 모두 해제 = 빨강 포함 모든 칩 회색. 순서 그대로
  const selectAll = useCallback(() => {
    setData((cur) => ({ ...persist(setAllState(cur, STATE_BLUE)), migrationNeeded: cur.migrationNeeded }))
  }, [])

  const selectNone = useCallback(() => {
    setData((cur) => ({ ...persist(setAllState(cur, STATE_OFF)), migrationNeeded: cur.migrationNeeded }))
  }, [])

  // 검증 5: 조 펼침/접힘 토글 → fridge-open-zones 즉시 저장 (검증 11 복원)
  const toggleOpen = useCallback((zone) => {
    setOpenZones((cur) => {
      const next = cur.includes(zone) ? cur.filter((z) => z !== zone) : [...cur, zone]
      return persistOpenZones(next)
    })
  }, [])

  // 검증 3·4: 드래그 정렬 (조 안만; 조 간이면 moveChipState가 원본 반환 → 저장 없음)
  const applyDrag = useCallback((dragName, targetName) => {
    setData((cur) => {
      const next = moveChipState(cur, dragName, targetName)
      if (next.chips === cur.chips) return cur
      return { ...persist(next), migrationNeeded: cur.migrationNeeded }
    })
  }, [])

  return {
    chips: data.chips,
    migrationNeeded: data.migrationNeeded,
    openZones,
    confirmMigration,
    getLegacyJson,
    addChip,
    removeChip,
    cycleChip,
    selectAll,
    selectNone,
    toggleOpen,
    applyDrag,
  }
}
