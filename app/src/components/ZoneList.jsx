// ZoneList.jsx — 조 1개 (헤더 카운트 n/m + ＋ 추가 입력 + 칩 나열 + 모바일 접기 ▼▲)
// · 접기 자격 = 콘텐츠 높이(scrollHeight) > 2행(74px)+4 실측(ResizeObserver) → 펼쳐도 ▲ 유지 (v1.5.1)
// · items는 App 스냅샷 + 집합 어긋남 시 chips 안전복귀 (미리보기 원복 방지, v1.6.1)
// · SortableContext id=zone-N — App의 컨테이너 착지 번역 규칙과 짝 (v1.6.3)
import { useEffect, useRef, useState } from 'react'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import { Chip } from './Chip.jsx'

// 칩 2행 높이 실측 상수 (명세 2절 72~78px 범위): 행 ≈ 33px × 2행 + gap 8px = 74px
const MAX_HEIGHT_2ROWS = 74
const OVERFLOW_EPSILON = 4

export function ZoneList({ zone, label, chips, items, onAdd, onRemove, onCycle, compact, open, onToggleOpen, longPressRef }) {
  const [adding, setAdding] = useState(false)
  const [text, setText] = useState('')
  const [qualifies, setQualifies] = useState(false)
  const chipsRef = useRef(null)

  const zoneChips = chips.filter((c) => c.zone === zone)
  // v1.6.1: dnd-kit items는 App 스냅샷(순서 기준)만 사용 — chips와 이름 집합이 어긋나면 chips로 안전 복귀
  const safeItems =
    items && items.length === zoneChips.length && zoneChips.every((c) => items.includes(c.name))
      ? items
      : zoneChips.map((c) => c.name)
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
          items={safeItems}
          strategy={rectSortingStrategy}
        >
          {safeItems.map((name) => {
            const c = zoneChips.find((x) => x.name === name)
            return c ? <Chip key={c.name} chip={c} onRemove={onRemove} onCycle={onCycle} longPressRef={longPressRef} /> : null
          })}
        </SortableContext>
      </div>

      {showToggle && (
        <div className="zone__fold">
          <button
            type="button"
            className="zone__fold-btn zone__fold-btn--gray"
            aria-label={open ? '접기' : '펼치기'}
            title={open ? '접기' : '펼치기'}
            onClick={onToggleOpen}
          >
            {open ? '▲' : '▼'}
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
