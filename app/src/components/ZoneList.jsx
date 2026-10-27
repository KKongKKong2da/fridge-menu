// ZoneList.jsx — v1.5
// 조 1개 = 헤더(번호 + 이름 + (n/m) + ＋) + 칩 목록 + ＋ 클릭 시 인라인 입력창 (Enter = 입력한 조에 파랑 칩)
// v1.5 변화:
//   - 접힘 기준: 개수(COLLAPSE_LIMIT 6) 폐지 → 래퍼 높이 연산.
//       칩 전량 렌더 + 래퍼에 max-height 2행(실측 상수 74px) + overflow hidden 적용.
//       접힘 대상 판정 = scrollHeight > clientHeight + 4 (ResizeObserver로 칩 추가·삭제·리사이즈 시 재계산).
//       발동은 640px 이하(compact)에서만, 데스크톱은 항상 펼침.
//   - 라벨 "펼치기 ▼" / "접기 ▲" (숫자 없음), 조 칩 영역 우측 하단, 터치 타깃 44×44px.
//   - (n/m) 헤더 카운트: n = 파랑+빨강(state 1·2) 칩 수, m = 전체 칩 수.
//     파생 계산(저장하지 않는다) → chips가 바뀌는 모든 조작(색·추가·삭제·일괄·드래그) 후 React가 다시 렌더하며 즉시 갱신.
//   - SortableContext items = 조의 칩 전량 (접힌 조도 3행째 칩이 DOM에 존재 → 드래그·정렬 정상).
import { useEffect, useRef, useState } from 'react'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import { Chip } from './Chip.jsx'

// 칩 2행 높이 실측 상수 (명세 2절 72~78px 범위): 행 ≈ 33px(7+7+글자줄높이) × 2행 + gap 8px = 74px
const MAX_HEIGHT_2ROWS = 74
const OVERFLOW_EPSILON = 4 // 접힘 대상 판정: scrollHeight > clientHeight + 4

export function ZoneList({ zone, label, chips, onAdd, onRemove, onCycle, compact, open, onToggleOpen }) {
  const [adding, setAdding] = useState(false)
  const [text, setText] = useState('')
  const [overflow, setOverflow] = useState(false)
  const chipsRef = useRef(null)

  const zoneChips = chips.filter((c) => c.zone === zone)
  const selectedCount = zoneChips.filter((c) => c.state === 1 || c.state === 2).length
  const collapsed = compact && !open // 펼침(open)이면 max-height 제거 → 전량 노출
  const showToggle = compact && overflow // 실제로 2행을 넘는 칩이 있는 조만 버튼 (데스크톱은 표시 없음)

  // 명세 2절: 칩 추가·삭제·리사이즈 시 래퍼 높이 재측정 (ResizeObserver)
  useEffect(() => {
    const el = chipsRef.current
    if (!el) return
    const measure = () => setOverflow(el.scrollHeight > el.clientHeight + OVERFLOW_EPSILON)
    measure() // 펼쳐진 전량 높이 기준선 (max-height 없는 상태에서 측정 → true = 2행 초과 존재)
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [compact]) // compact 토글로 max-height 조건이 바뀌면 재측정 (칩 변화는 observer가 감지)

  const submit = () => {
    const name = text.trim()
    if (name === '') return
    onAdd(name, zone) // Enter로 입력한 조에 파랑 칩 / 중복 방지
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
