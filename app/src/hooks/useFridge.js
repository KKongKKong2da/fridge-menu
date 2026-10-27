// localStorage 'fridge-chips' 키 하나만 다루는 훅 (로직은 lib/storage.js 위임) — v1.2
// v1.2 변화:
//   - recent / pickRecent / applyDrag / removedDefaults 전부 제거 (최근·제안 바 폐지, 드래그 폐지)
//   - cycleChip = 파랑→빨강→검정 사이클 + 조 단위 자동 이동
//   - selectAll / selectNone = 일괄 버튼 (순서 유지, state만 변경)
// kinds(종류 체크)는 화면 상태이므로 App이 들고 있고 localStorage에 저장하지 않는다 (승인 3).
import { useCallback, useState } from 'react'
import { STATE_BLUE, STATE_OFF } from '../data/materials.js'
import {
  addChipState,
  cycleChipState,
  loadState,
  persist,
  removeChipState,
  setAllState,
} from '../lib/storage.js'

export function useFridge() {
  const [data, setData] = useState(() => loadState())

  // x 삭제: 화면 + localStorage 제거 (검증 10)
  const removeChip = useCallback((name) => {
    setData((cur) => persist(removeChipState(cur, name)))
  }, [])

  // 조 끝 + Enter 추가 (검증 8, 9)
  const addChip = useCallback((rawName, zone) => {
    let result = 'added'
    setData((cur) => {
      const next = addChipState(cur, rawName, zone)
      result = next.result
      if (next.result !== 'added') return cur
      return persist(next.state)
    })
    return result
  }, [])

  // 검증 2: 칩 클릭 1회 = 파랑 -> 빨강 -> 검정 -> 파랑 순환 (+ 조 단위 이동), 즉시 저장
  const cycleChip = useCallback((name) => {
    setData((cur) => persist(cycleChipState(cur, name)))
  }, [])

  // 검증 6: 모두 선택 = 빨강 포함 모든 칩 파랑, 순서 그대로
  const selectAll = useCallback(() => {
    setData((cur) => persist(setAllState(cur, STATE_BLUE)))
  }, [])

  // 검증 7: 모두 해제 = 빨강 포함 모든 칩 검정, 순서 그대로
  const selectNone = useCallback(() => {
    setData((cur) => persist(setAllState(cur, STATE_OFF)))
  }, [])

  return {
    chips: data.chips,
    addChip,
    removeChip,
    cycleChip,
    selectAll,
    selectNone,
  }
}
