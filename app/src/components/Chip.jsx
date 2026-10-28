// Chip.jsx — v1.6
// 솔리드 칩 (상태색 100% 채움 + 테두리 없음 + 흰 글자, styles.css) 유지.
// 클릭 1회 = 사이클 (파랑 1 -> 빨강 2 -> 회색 0 -> 파랑 1). 위치 이동은 storage에서 state만 변경.
//
// 드래그 (v1.6 확정 — 명세 1절은 목표만 지시, 구현 방식은 작성자 선택):
//   [잡는 법] 입력 장치별로 센서를 분리한다 (App.jsx, dnd-kit — 신규 라이브러리 없음):
//     - MouseSensor  { distance: 5 }  → PC: 눌른 채 5px = 즉시 드래그 (승인대로 PC는 현행 즉시 유지)
//     - TouchSensor  { delay: LONG_PRESS_MS(600), tolerance: 10 }
//         모바일: 0.6초 꾹 누름(아이폰 홈화면 방식). 600ms 안에 손이 10px 이상 움직이면
//         센서가 스스로 취소하고 스크롤에 양보한다 (delay + tolerance 구조).
//   [스크롤 화해] touch-action을 상태별 스위칭 (아래 style의 touchAction):
//     - 평소(비활성): pan-y → 세로 손쓰기는 브라우저가 화면 스크롤로 직결 (칩은 안 움직임)
//     - 드래그 중(isDragging): none → 브라우저 제스처가 드래그를 가로채는 것만 차단
//     (v1.5.2.1 실험: 상시 manipulation/none 모두 모바일에서 드래그·스크롤 중 하나가 상므로
//      "평소 pan-y, 활성 시 none" 인라인 스위칭 유지가 최선 — v1.5.1 결론 재확인)
//   [색·× 오평발 방지 — v1.6 신규] longPressRef(App의 useLongPressDrag stateRef)로
//     드래그 중(live) 또는 드래그 종료 350ms 이내의 클릭은 onCycle/onRemove를 실행하지 않는다.
//     dnd-kit이 활성화 후 click을 잡음(stopPropagation)하지만, 센서 취소·드롭 경계에서
//     클릭이 새는 경로를 화면 측에서 이중으로 봉함 (명세 검증 5).
//   [짧은 누름] 600ms 미만 탭 = 클릭(색 사이클) 정상 동작 (센서 미활성 → 클릭 유지).
//   × 버튼에는 listeners를 붙이지 않아 드래그 대상이 아니다 (v1.5 유지).
//   [잡힌 표시·부드러움] 활성화 시 스케일 1.05 + 그림자(.chip--dragging) + z-index 50,
//     드롭 후 새 자리로 150ms transform transition (유지).
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const DRAG_CLICK_SUPPRESS_MS = 350 // App의 useLongPressDrag SUPPRESS_MS와 동일 (드롭 파생 클릭 차단)

export function Chip({ chip, onRemove, onCycle, longPressRef }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: chip.name })

  // 검증 5: 드래그 살아있는 중 / 종료 직후 클릭은 색 사이클·× 실행 금지
  const isDragLinked = () => {
    const lp = longPressRef?.current
    if (!lp) return false
    if (lp.live) return true
    return Date.now() - lp.lastEnd < DRAG_CLICK_SUPPRESS_MS
  }

  const handleCycle = () => {
    if (isDragLinked()) return
    onCycle(chip.name)
  }

  const handleRemove = () => {
    if (isDragLinked()) return
    onRemove(chip.name)
  }

  const style = {
    transform: (CSS.Transform.toString(transform) ?? '') + (isDragging ? ' scale(1.05)' : ''),
    transition: transition ? 'transform 150ms ease' : undefined, // 드롭 후 150ms 미끄러짐
    zIndex: isDragging ? 50 : undefined,
    // 검증 3·5 (v1.6): 평소 pan-y(세로 손쓰기 = 화면 스크롤만) → 드래그 활성화 시에만 none
    touchAction: isDragging ? 'none' : 'pan-y',
  }

  return (
    <span
      ref={setNodeRef}
      style={style}
      className={`chip chip--s${chip.state}${isDragging ? ' chip--dragging' : ''}`}
      data-chip={chip.name}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        className="chip__body"
        aria-label={`${chip.name} 상태 변경 (0.6초 길게 누르면 이동)`}
        onClick={handleCycle}
        {...attributes}
        {...listeners}
      >
        {chip.name}
      </button>
      <button
        type="button"
        className="chip__x"
        aria-label={`${chip.name} 삭제`}
        onClick={(e) => {
          e.stopPropagation()
          handleRemove()
        }}
      >
        ×
      </button>
    </span>
  )
}
