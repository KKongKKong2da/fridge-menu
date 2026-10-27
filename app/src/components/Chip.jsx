// Chip.jsx — v1.2
// linear 스타일: 배경 투명, 테두리 1.5px solid, 글자 색 = 테두리 색 (styles.css에서 상태별 정의)
// 클릭 1회 = 사이클 (파랑 1 -> 빨강 2 -> 검정 0 -> 파랑 1). 사이클+조 단위 이동은 storage가 처리.
// x 버튼은 클릭과 분리된 별도 영역 (x 클릭이 사이클을 유발하지 않게 stopPropagation).
// v1.1의 useSortable/리스너/transform 제거 (드래그 폐기 → 검증 20: 칩은 드래그로 움직이지 않는다).

export function Chip({ chip, onRemove, onCycle }) {
  return (
    <span className={`chip chip--s${chip.state}`} data-chip={chip.name}>
      <button
        type="button"
        className="chip__body"
        aria-label={`${chip.name} 상태 변경`}
        onClick={() => onCycle(chip.name)} // 검증 2: 클릭 1회 = 1단계
      >
        {chip.name}
      </button>
      <button
        type="button"
        className="chip__x"
        aria-label={`${chip.name} 삭제`}
        onClick={(e) => {
          e.stopPropagation()
          onRemove(chip.name) // 검증 10: x = 삭제 (사이클과 분리)
        }}
      >
        ×
      </button>
    </span>
  )
}
