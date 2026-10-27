// Chip.jsx — v1.4
// 솔리드 스타일 (명세 1절): 상태색 100% 채움 + 테두리 없음 + 흰 글자 (styles.css)
//   chip--s1 파랑 #2563eb / chip--s2 빨강 #dc2626 / chip--s0 회색 #6b7280 (값 0, 표기만 회색)
// 클릭 1회 = 사이클 (파랑 1 -> 빨강 2 -> 회색 0 -> 파랑 1). 위치 이동은 없음 (storage가 state만 변경).
// 드래그 (v1.4): useSortable의 listeners를 칩 본체 버튼에만 붙인다.
//   - TouchSensor delay 0 / tolerance 8 → 탭(8px 이내)은 클릭(사이클), 8px 이상 움직임 = 즉시 드래그
//   - MouseSensor distance 5
//   - 드래그 중: 스케일 1.08 + 그림자 + z-index 50 (명세 6절)
//   - × 버튼에는 listeners를 붙이지 않아 드래그 대상이 되지 않는다.
// 접힌 조에서는 2행까지만 렌더되므로 3행째 칩은 드래그 시작 대상이 아니다 (승인 2).
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export function Chip({ chip, onRemove, onCycle }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: chip.name })

  const style = {
    // 드래그 중에는 이동 transform에 스케일 1.08을 얹는다 (명세 6절)
    transform: (CSS.Transform.toString(transform) ?? '') + (isDragging ? ' scale(1.08)' : ''),
    transition: transition ? 'transform 150ms ease' : undefined, // 명세 6절: 드롭 후 150ms 미끄러짐
    zIndex: isDragging ? 50 : undefined,
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
        aria-label={`${chip.name} 상태 변경 (길게 누르면 이동)`}
        onClick={() => onCycle(chip.name)} // 검증 2: 탭 1회 = 1단계 — 센서(delay 250·tolerance 8)가 실패 시에만 발동
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
          onRemove(chip.name) // x = 삭제 (사이클·드래그와 분리)
        }}
      >
        ×
      </button>
    </span>
  )
}
