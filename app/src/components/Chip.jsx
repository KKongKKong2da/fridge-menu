// Chip.jsx — v1.3
// 하이브리드 스타일: 상태색 12% opacity 배경 채움 + 테두리 2px + 진한 글자 (styles.css)
//   chip--s1 파랑 #2563eb / chip--s2 빨강 #dc2626 / chip--s0 회색 #6b7280 (구 검정 슬롯, 값 0)
// 클릭 1회 = 사이클 (파랑 1 -> 빨강 2 -> 회색 0 -> 파랑 1). 위치 이동은 없음 (storage가 state만 변경).
// 드래그 (v1.3 복구): useSortable의 listeners를 칩 본체 버튼에만 붙인다.
//   - TouchSensor delay 300ms → 300ms 미만 탭은 클릭(사이클), 길게 누르면 드래그
//   - × 버튼에는 listeners를 붙이지 않아 드래그 대상이 되지 않는다 (명세 5번 승인)
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export function Chip({ chip, onRemove, onCycle }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: chip.name })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    zIndex: isDragging ? 2 : undefined,
  }

  return (
    <span
      ref={setNodeRef}
      style={style}
      className={`chip chip--s${chip.state}`}
      data-chip={chip.name}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        className="chip__body"
        aria-label={`${chip.name} 상태 변경 (길게 누르면 이동)`}
        onClick={() => onCycle(chip.name)} // 검증 3: 탭 1회 = 1단계 (300ms 미만)
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
          onRemove(chip.name) // 검증 10: x = 삭제 (사이클·드래그와 분리)
        }}
      >
        ×
      </button>
    </span>
  )
}
