// localStorage 'fridge-chips:v3' 키 하나만 다루는 훅 (로직은 lib/storage.js 위임) — v1.3
// v1.3 변화:
//   - 마이그레이션 안내(migrationNeeded → confirmMigration) 신설: 8절 (a) 방식
//       신규 키 없고 레거시 키 존재 시 63종 파랑 생성 + 안내 표시, 확인 시 레거시 키 삭제
//   - cycleChip = 파랑→빨강→회색→파랑 사이클, 위치 이동 없음 (자동이동 코드 제거)
//   - applyDrag = 드래그 정렬 단일 진입점 (조 내 자유 / 조 간 = zone 변경, 빈 조는 그 조 마지막)
//   - selectAll / selectNone = 일괄 버튼 (순서 유지, state만 변경)
// kinds(종류 체크)는 화면 상태이므로 App이 들고 있고 localStorage에 저장하지 않는다 (v1.2 승인 3 유지).
import { useCallback, useState } from 'react'
import { STATE_BLUE, STATE_OFF } from '../data/materials.js'
import {
  addChipState,
  completeMigration,
  cycleChipState,
  dropIntoEmptyZone,
  loadState,
  persist,
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

  // 초기화 확인 (검증 2): 현재 63종을 신규 키에 확정 저장 + 레거시·잔존 키 삭제 → 안내 닫힘
  const confirmMigration = useCallback(() => {
    setData((cur) => {
      completeMigration(cur.chips)
      return { chips: cur.chips, migrationNeeded: false }
    })
  }, [])

  // 백업 복사용 원문 (v1.2 chips JSON) — 안내 카드에서 클립보드 복사
  const getLegacyJson = useCallback(() => readLegacyJson(), [])

  // x 삭제: 화면 + localStorage 제거 (검증 10)
  const removeChip = useCallback((name) => {
    setData((cur) => ({ ...persist(removeChipState(cur, name)), migrationNeeded: cur.migrationNeeded }))
  }, [])

  // 조 끝 ＋ Enter 추가 (검증 8, 9): 입력한 조의 칩이 된다
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

  // 검증 3·4: 칩 클릭 1회 = 파랑 -> 빨강 -> 회색 -> 파랑 순환, 위치 불변, 즉시 저장
  const cycleChip = useCallback((name) => {
    setData((cur) => ({ ...persist(cycleChipState(cur, name)), migrationNeeded: cur.migrationNeeded }))
  }, [])

  // 검증 7: 모두 선택 = 빨강 포함 모든 칩 파랑 / 모두 해제 = 빨강 포함 모든 칩 회색. 순서 그대로
  const selectAll = useCallback(() => {
    setData((cur) => ({ ...persist(setAllState(cur, STATE_BLUE)), migrationNeeded: cur.migrationNeeded }))
  }, [])

  const selectNone = useCallback(() => {
    setData((cur) => ({ ...persist(setAllState(cur, STATE_OFF)), migrationNeeded: cur.migrationNeeded }))
  }, [])

  // 검증 5·6: 드래그 정렬 (조 내 자유 / 조 간 교차 = zone 변경)
  //   targetName = 드롭 대상 칩 이름, 빈 조 드롭이면 null + dropZone 지정
  const applyDrag = useCallback((dragName, targetName, dropZone = null) => {
    setData((cur) => {
      const next =
        targetName === null && dropZone !== null
          ? dropIntoEmptyZone(cur, dragName, dropZone)
          : moveChipState(cur, dragName, targetName)
      if (next.chips === cur.chips) return cur
      return { ...persist(next), migrationNeeded: cur.migrationNeeded }
    })
  }, [])

  return {
    chips: data.chips,
    migrationNeeded: data.migrationNeeded,
    confirmMigration,
    getLegacyJson,
    addChip,
    removeChip,
    cycleChip,
    selectAll,
    selectNone,
    applyDrag,
  }
}
