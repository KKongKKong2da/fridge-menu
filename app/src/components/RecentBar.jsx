// M2: ＋(기타) 버튼 + 최근바 클릭 -> 타이핑 없이 즉시 칩 생성 (onPick)
// 최근 칩 클릭 시 pickRecentState: 없으면 칩 생성(기본 재료=그 조, 그 외=custom),
// 이미 있으면 recent만 최신 앞으로 이동 (중복 생성 없음)
export function RecentBar({ recent, onOpenCustom, onPick }) {
  return (
    <section className="custom-area">
      <button type="button" className="zone__add zone__add--custom" onClick={onOpenCustom}>
        ＋(기타)
      </button>

      <div className="recent">
        <span className="recent__label">최근:</span>
        {recent.length === 0 && (
          <span className="recent__empty">직접 입력한 재료가 여기에 표시됩니다</span>
        )}
        {recent.map((name) => (
          <button
            key={name}
            type="button"
            className="chip chip--recent chip--recent-btn"
            aria-label={`${name} 칩으로 추가`}
            onClick={() => onPick(name)}
          >
            {name}
          </button>
        ))}
      </div>
    </section>
  )
}
