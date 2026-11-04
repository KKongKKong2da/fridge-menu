// useLongPressDrag.js — 모바일 롱프레스 600ms 단일 소스 (LONG_PRESS_MS)
// · live/lastEnd ref 기록: 드래그 중·종료 350ms 이내의 클릭을 색·× 오평발로부터 봉인 (Chip이 참조)
// · 콜백 useCallback 고정 — App의 handleDragEnd가 DndContext에 항상 같은 참조로 연결 (v1.6.3)
import { useCallback, useRef } from 'react'

export const LONG_PRESS_MS = 600 // 꾹 누름 → 잡힘 (App의 TouchSensor delay와 동일 값, 단일 소스)
const SUPPRESS_MS = 350 // 드래그 종료 후 이 시간 안의 클릭은 색 사이클·× 로 취급하지 않음

export function useLongPressDrag() {
  const stateRef = useRef({ live: false, lastEnd: 0 })

  const onDragStart = useCallback(() => {
    stateRef.current.live = true
  }, [])

  const onDragEnd = useCallback(() => {
    stateRef.current.live = false
    stateRef.current.lastEnd = Date.now()
  }, [])

  return { stateRef, onDragStart, onDragEnd }
}
