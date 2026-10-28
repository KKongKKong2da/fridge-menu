// ZoneList.jsx — v1.6
// v1.6: Chip에 longPressRef 전달 (드래그 직후 색·× 자동 발동 차단 — App의 useLongPressDrag stateRef).
// v1.6 회색 통일: ▼/▲ 접기 버튼 = .zone__fold-btn--gray (styles.css --gray 단일 변수 참조).
// v1.5.2 라벨: 텍스트 제거, ▼/▲ 기호만 (aria-label·title에는 '펼치기/접기' 유지).
//   크기 = 조 끝 ＋ 버튼과 동일 (padding 6px 11px · font 15px · line-height 1). 색만 회색으로 변경
//   (사용자 요청 ③: 모두 선택/해제보다 세로가 커 보이는 것 해소 + 기호만 실험)
// 조 1개 = 헤더(번호 + 이름 + (n/m) + ＋) + 칩 목록 + ＋ 클릭 시 인라인 입력창 (Enter = 입력한 조에 파랑 칩)
// v1.5.1 수정:
//   - [접기 기능 소멸 버그] v1.5는 판정을 "scrollHeight > clientHeight + 4"로 두어, 조가 펼친 상태
//     (max-height 제거 → clientHeight = 전체 콘텐츠 높이)가 되면 판정이 false가 되어
//     "펼치기 ▼ / 접기 ▲" 버튼 자체가 사라졌다.
//   - [해결] 판정을 콘텐츠 높이 기준으로 바꾼다:
//       qualifies = scrollHeight > (2행 높이 74px + 4)   → 펼쳐져 있어도 scrollHeight는 전체 콘텐츠 높이이므로
//       자격이 유지되어 접기 ▲ 버튼이 계속 보인다. 접힌 상태도 같은 값 → 펼치기 ▼ 버튼.
//   - 라벨 텍스트는 v1.5.1까지 "펼치기 ▼ / 접기 ▲" + 44×44px → v1.5.2에서 기호만으로 교체 (위 참조)
//   - (n/m) 헤더 카운트 유지: n = 파랑+빨강(state 1·2), m = 전체. 파생 계산(저장 안 함), 즉시 갱신.
//   - SortableContext items = App의 스냅샷(v1.6.1): 드롭 확정 시점에만 갱신 → 미리보기 자리 고정
//     (items가 prop chips 순서를 직접 따라가면 드롭 직전 transform이 원본으로 복원되어 칩이 옛 자리로 되돌아감).
//     안전복귀: items와 chips 이름 집합이 어긋나면 chips 기준 items로 즉시 복귀. 접힌 조는 3행째 미표시 → 펼치고 옮기기 정책 (v1.5 유지).
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
