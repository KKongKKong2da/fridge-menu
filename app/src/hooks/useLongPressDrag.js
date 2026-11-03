// useLongPressDrag.js — v1.6.3 (순수 React 훅, 신규 라이브러리 없음)
// 목적:
//   ① 모바일 잡기 시간을 한곳에서 정의: 600ms (LONG_PRESS_MS — App의 TouchSensor delay가 참조하는 단일 소스)
//   ② 드래그가 살아 있는 중(live)과 끝난 직후의 시각을 ref로 기록 →
//      Chip의 클릭(색 사이클)·× 가 드래그 시작·종료와 얽혀 자동 발동하는 것을 막는다 (명세 1절 검증 5)
//   ③ v1.6.3: 콜백을 useCallback으로 고정 → App의 handleDragEnd가 DndContext에
//      항상 같은 함수 참조로 연결된다 (렌더마다 새 closure가 만들어지는 문제 제거).
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
