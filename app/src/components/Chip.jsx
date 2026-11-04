// Chip.jsx — 3색 솔리드 칩 (클릭 1회 = 파랑→빨강→회색→파랑)
// · 드래그 활성 중/종료 350ms 이내 클릭 = 색·× 발동 봉인 (isDragLinked, App의 useLongPressDrag ref)
// · touch-action 스위칭: 평소 pan-y(스크롤) → 드래그 중에만 none — 스크롤과 드래그 동거
// · × 버튼은 드래그 대상 아님(listeners 미부착), 활성화 시 스케일 1.05 + z50 + 150ms 미끄러짐
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { SUPPRESS_MS } from '../hooks/useLongPressDrag.js'


export function Chip({ chip, onRemove, onCycle, longPressRef }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: chip.name })

  // 검증 5: 드래그 살아있는 중 / 종료 직후 클릭은 색 사이클·× 실행 금지
  const isDragLinked = () => {
    const lp = longPressRef?.current
    if (!lp) return false
    if (lp.live) return true
    return Date.now() - lp.lastEnd < SUPPRESS_MS
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
