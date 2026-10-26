// M2: 칩 클릭 = 색 사이클. M3: useSortable로 드래그 유닛 (id = 칩 이름).
// - 짧은 클릭(Mouse 6px 미만, Touch 탭)은 센서 조건 미충족 -> 사이클로 통과
// - x 버튼: 클릭(stopPropagation)과 드래그 시작(onPointerDown stopPropagation) 모두 차단
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export function Chip({ chip, onRemove, onCycle }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: chip.name,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 3 : 1,
    opacity: isDragging ? 0.65 : 1,
  }

  return (
    <span
      ref={setNodeRef}
      style={style}
      className={`chip chip--s${chip.state}${isDragging ? ' chip--dragging' : ''}`}
      data-chip={chip.name}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        e.stopPropagation()
        onCycle(chip.name) // 검증 7: 짧은 클릭 = 검정>파랑>빨강>검정
      }}
    >
      <span className="chip__name">{chip.name}</span>
      <button
        type="button"
        className="chip__x"
        aria-label={`${chip.name} 삭제`}
        onClick={(e) => {
          e.stopPropagation()
          onRemove(chip.name) // 검증 2: x = 삭제 (사이클과 분리)
        }}
        onPointerDown={(e) => e.stopPropagation()} // x 누름이 드래그로 시작되지 않게
      >
        ×
      </button>
    </span>
  )
}
