// Chip.jsx — v1.5
// 솔리드 칩 (상태색 100% 채움 + 테두리 없음 + 흰 글자, styles.css) 유지.
// 클릭 1회 = 사이클 (파랑 1 -> 빨강 2 -> 회색 0 -> 파랑 1). 위치 이동은 storage에서 state만 변경.
// 드래그 (v1.5, iPhone 홈화면 방식):
//   - App의 PointerSensor activationConstraint { delay: 1500, tolerance: 10 } 단일 센서가 전역 규제.
//     1500ms 꾹 누름 + 10px 이내 정지 = 활성화(들림). 10px 선행 이동 = 드래그 취소 → 스크롤에 넘김.
//   - 짧은 탭 = onClick(색 사이클) 100% 동작. (v1.4 TouchSensor delay 0의 탭 소멸 문제 소멸)
//   - 활성화 시 스케일 1.05 + 그림자 + z-index 50, 드롭 후 150ms transition.
//   - touch-action: 기본 pan-y(스크롤 양보) → 드래그 활성화 시에만 none.
//   - 핸들(⠿) 분리 없음. × 버튼에는 listeners를 붙이지 않아 드래그·롱프레스 대상이 아니다.
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export function Chip({ chip, onRemove, onCycle }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: chip.name })

  const style = {
    // v1.5: 활성화(들림) 스케일 1.05 (v1.4의 1.08 → 1.05로 확정)
    transform: (CSS.Transform.toString(transform) ?? '') + (isDragging ? ' scale(1.05)' : ''),
    transition: transition ? 'transform 150ms ease' : undefined, // 드롭 후 150ms 미끄러짐 유지
    zIndex: isDragging ? 50 : undefined,
    // 스크롤 자유(pan-y) ↔ 드래그 활성화 시에만 none (명세 1절)
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
        aria-label={`${chip.name} 상태 변경 (1.5초 길게 누르면 이동)`}
        onClick={() => onCycle(chip.name)} // 짧은 탭 = 색 사이클 (지연 센서는 클릭을 막지 않음)
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
          onRemove(chip.name) // x = 삭제 (사이클·드래그와 분리, 드래그 대상 아님)
        }}
      >
        ×
      </button>
    </span>
  )
}
