// ZoneList.jsx — v1.5.1
// 조 1개 = 헤더(번호 + 이름 + (n/m) + ＋) + 칩 목록 + ＋ 클릭 시 인라인 입력창 (Enter = 입력한 조에 파랑 칩)
// v1.5.1 수정:
//   - [접기 기능 소멸 버그] v1.5는 판정을 "scrollHeight > clientHeight + 4"로 두어, 조가 펼친 상태
//     (max-height 제거 → clientHeight = 전체 콘텐츠 높이)가 되면 판정이 false가 되어
//     "펼치기 ▼ / 접기 ▲" 버튼 자체가 사라졌다.
//   - [해결] 판정을 콘텐츠 높이 기준으로 바꾼다:
//       qualifies = scrollHeight > (2행 높이 74px + 4)   → 펼쳐져 있어도 scrollHeight는 전체 콘텐츠 높이이므로
//       자격이 유지되어 접기 ▲ 버튼이 계속 보인다. 접힌 상태도 같은 값 → 펼치기 ▼ 버튼.
//       open과 무관하게 자격만 있으면 compact일 때 버튼 표시.
//   - (n/m) 헤더 카운트 유지: n = 파랑+빨강(state 1·2), m = 전체. 파생 계산(저장 안 함), 즉시 갱신.
//   - SortableContext items = 조의 칩 전량. 접힌 조는 3행째 칩이 화면에 안 보이므로 펼치고 옮기는 정책 (v1.5 확정 유지).
import { useEffect, useRef, useState } from 'react'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import { Chip } from './Chip.jsx'

// 칩 2행 높이 실측 상수 (명세 2절 72~78px 범위): 행 ≈ 33px × 2행 + gap 8px = 74px
const MAX_HEIGHT_2ROWS = 74
const OVERFLOW_EPSILON = 4

export function ZoneList({ zone, label, chips, onAdd, onRemove, onCycle, compact, open, onToggleOpen }) {
  const [adding, setAdding] = useState(false)
  const [text, setText] = useState('')
  const [qualifies, setQualifies] = useState(false)
  const chipsRef = useRef(null)

  const zoneChips = chips.filter((c) => c.zone === zone)
  const selectedCount = zoneChips.filter((c) => c.state === 1 || c.state === 2).length
  const collapsed = compact && !open
  const showToggle = compact && qualifies // 펼친 조도 qualifies 유지 → 접기 ▲ 계속 표시

  // 칩 추가·삭제·리사이즈 시 콘텐츠 높이 재측정 (ResizeObserver)
  useEffect(() => {
    const el = chipsRef.current
    if (!el) return
    const measure = () => setQualifies(el.scrollHeight > MAX_HEIGHT_2ROWS + OVERFLOW_EPSILON)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [compact, zoneChips.length]) // 칩 개수 변화도 즉시 반영 (observer와 이중 안전)

  const submit = () => {
    const name = text.trim()
    if (name === '') return
    onAdd(name, zone)
    setText('')
    setAdding(false)
  }

  return (
    <section className="zone" data-zone={zone}>
      <div className="zone__header">
        <span className="zone__title">
          {zone} {label} ({selectedCount}/{zoneChips.length})
        </span>
        <button
          type="button"
          className="zone__add"
          aria-label={`${label} 조 재료 추가`}
          onClick={() => setAdding((v) => !v)}
        >
          ＋
        </button>
      </div>

      <div
        ref={chipsRef}
        className="zone__chips"
        style={collapsed ? { maxHeight: MAX_HEIGHT_2ROWS, overflow: 'hidden' } : undefined}
      >
        <SortableContext
          id={`zone-${zone}`}
          items={zoneChips.map((c) => c.name)}
          strategy={rectSortingStrategy}
        >
          {zoneChips.map((c) => (
            <Chip key={c.name} chip={c} onRemove={onRemove} onCycle={onCycle} />
          ))}
        </SortableContext>
      </div>

      {showToggle && (
        <div className="zone__fold">
          <button
            type="button"
            className="zone__fold-btn"
            aria-label={open ? '접기' : '펼치기'}
            onClick={onToggleOpen}
          >
            {open ? '접기 ▲' : '펼치기 ▼'}
          </button>
        </div>
      )}

      {adding && (
        <div className="zone__input">
          <input
            type="text"
            className="zone__input-box"
            placeholder={`${label} 재료 이름 (Enter) — 예: 라면, 우유`}
            value={text}
            autoFocus
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                submit()
              }
              if (e.key === 'Escape') {
                setAdding(false)
                setText('')
              }
            }}
          />
        </div>
      )}
    </section>
  )
}
