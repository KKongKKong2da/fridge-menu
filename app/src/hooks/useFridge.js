// localStorage 'fridge-chips' 키 하나만 다루는 훅 (로직은 lib/storage.js 위임)
// M2: 칩 클릭 사이클(검정>파랑>빨강) + 최근바 클릭 즉시 추가
// M3: applyDrag(activeId, overId) — dnd DragEnd를 storage.moveByDragState(블록 모델)에 위임
import { useCallback, useState } from 'react'
import { DEFAULT_MATERIALS } from '../data/materials.js'
import {
  addChipState,
  cycleChipState,
  loadState,
  moveByDragState,
  persist,
  pickRecentState,
  removeChipState,
} from '../lib/storage.js'

export function useFridge() {
  const [data, setData] = useState(() => loadState(localStorage))

  // x 삭제: 화면 + localStorage 제거 (검증 2)
  const removeChip = useCallback((name) => {
    setData((cur) => persist(localStorage, removeChipState(cur, name)))
  }, [])

  // + Enter 추가 (검증 3, 5)
  const addChip = useCallback((rawName, zone) => {
    let result = 'added'
    setData((cur) => {
      const next = addChipState(cur, rawName, zone)
      result = next.result
      if (next.result !== 'added') return cur
      return persist(localStorage, next.state)
    })
    return result
  }, [])

  // M2 검증 7: 칩 클릭 1회 = state 0 -> 1 -> 2 -> 0 순환, 즉시 저장
  const cycleChip = useCallback((name) => {
    setData((cur) => persist(localStorage, cycleChipState(cur, name)))
  }, [])

  // M2 검증 6: 최근바 클릭 = 타이핑 없이 즉시 칩 생성 + recent 갱신
  const pickRecent = useCallback((name) => {
    setData((cur) => persist(localStorage, pickRecentState(cur, name).state))
  }, [])

  // M3 검증 13: DragEnd(active.id, over.id) -> 블록 모델로 새 순서 저장
  //   칩→칩(조 경계 넘김), 칩→헤더(조 선두), 헤더→헤더(블록 통째) 모두 storage 규칙
  const applyDrag = useCallback((activeId, overId) => {
    setData((cur) => persist(localStorage, moveByDragState(cur, activeId, overId)))
  }, [])

  // 삭제된 기본 재료 (입력창 제안용)
  const removedDefaults = DEFAULT_MATERIALS.filter(
    (m) => !data.chips.some((c) => c.name === m.name)
  ).map((m) => m.name)

  return {
    chips: data.chips,
    recent: data.recent,
    removedDefaults,
    addChip,
    removeChip,
    cycleChip,
    pickRecent,
    applyDrag,
  }
}
