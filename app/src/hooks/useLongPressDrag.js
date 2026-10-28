// useLongPressDrag.js — v1.6 롱프레스 상태 추적 (신규 라이브러리 없음, 순수 React 훅)
// 목적:
//   ① 모바일 잡기 시간을 한곳에서 정의: 600ms (아이폰 기준 1~2초 범위 중 손에 편한 짧은 값 —
//      1.5초는 "잡히려다 놓친" 체감이 길어 600ms로 단축. 앱 드래그 모드 진입감에 맞춤)
//   ② 드래그가 살아 있는 중(live)과 끝난 직후의 시간을 ref로 기록 →
//      Chip의 클릭(색 사이클)이 드래그 시작·종료와 얽해 자동 발동하는 것을 막는다 (명세 1절: 옮긴 직후 색·× 자동 발동 없음)
// 사용:
//   App: const longPress = useLongPressDrag()
//        <DndContext onDragStart={longPress.onDragStart} onDragEnd={longPress.onDragEnd} ...>
//        longPress.stateRef 를 ZoneList → Chip에 전달
//   Chip: 클릭 시 stateRef.current.live 중이면 사이클 무시,
//         드래그 종료 후 SUPPRESS_MS(350) 내의 클릭도 무시 (드래그 종료 파생 클릭 차단)
import { useRef } from 'react'

export const LONG_PRESS_MS = 600 // 꾹 누름 → 잡힘 (App의 TouchSensor delay와 동일 값, 단일 소스)
const SUPPRESS_MS = 350 // 드래그 종료 후 이 시간 안의 클릭은 색 사이클로 취급하지 않음

export function useLongPressDrag() {
  const stateRef = useRef({ live: false, lastEnd: 0 })

  const onDragStart = () => {
    stateRef.current.live = true
  }

  const onDragEnd = () => {
    stateRef.current.live = false
    stateRef.current.lastEnd = Date.now()
  }

  return { stateRef, onDragStart, onDragEnd }
}
