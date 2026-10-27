// Chip.jsx — v1.5.1
// 솔리드 칩 (상태색 100% 채움 + 테두리 없음 + 흰 글자, styles.css) 유지.
// 클릭 1회 = 사이클 (파랑 1 -> 빨강 2 -> 회색 0 -> 파랑 1). 위치 이동은 storage에서 state만 변경.
// 드래그 (v1.5.1, 사용자 요청):
//   - App의 센서 분리 (v1.5 단일 PointerSensor delay는 모바일/PC 모두 활성화 불안정 → 폐기):
//       MouseSensor  { distance: 5 }                  → PC: 눌른 채 5px = 즉시 드래그
//       TouchSensor  { delay: 1500, tolerance: 10 }   → 모바일: 1.5초 꾹 = 들림(iPhone 방식),
//                                                        10px 선행 이동 = 취소 → 스크롤에 넘김
//   - 짧은 탭 = onClick(색 사이클) 100% 동작. × 버튼에는 listeners를 붙이지 않아 드래그 대상이 아니다.
//   - 활성화 시 스케일 1.05 + 그림자 + z-index 50, 드롭 후 150ms transition.
//   - touch-action: 기본 pan-y(스크롤 양보) → 드래그 활성화 시에만 none (인라인).
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export function Chip({ chip, onRemove, onCycle }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: chip.name })

  const style = {
    transform: (CSS.Transform.toString(transform) ?? '') + (isDragging ? ' scale(1.05)' : ''),
    transition: transition ? 'transform 150ms ease' : undefined, // 드롭 후 150ms 미끄러짐
    zIndex: isDragging ? 50 : undefined,
    touchAction: isDragging ? 'none' : 'pan-y', // 스크롤 양보 ↔ 활성화 시에만 none
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
        aria-label={`${chip.name} 상태 변경 (1.5초 길게 누르면 이동)`}
        onClick={() => onCycle(chip.name)}
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
          onRemove(chip.name)
        }}
      >
        ×
      </button>
    </span>
  )
}
