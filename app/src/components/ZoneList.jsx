// ZoneList.jsx — v1.4
// 조 1개 = 헤더(번호 + 이름 + ＋) + 칩 목록 + ＋ 클릭 시 인라인 입력창 (Enter = 입력한 조에 파랑 칩)
// v1.4 변화:
//   - 드래그는 조 안 정렬만 (useDroppable/zone-N 컨테이너 폐지 → 조 간 드롭 불가, 검증 4)
//   - 접기/펼치기 (명세 5절): 640px 이하(컴팩트)일 때만 발동.
//       접힘 = 2행까지만 렌더 (2행 기준 = 한 행 약 4칩 → 8개까지). '펼치기 ▾' 버튼.
//       펼침 = 전량 렌더 + '접기 ▴' 버튼. 펼침 여부는 App의 openZones(localStorage)가 단일 소스.
//       (승인 2) 접힌 조는 2행까지만 렌더·드래그 — SortableContext/Chip도 2행분만.
//       데스크톱(640px 초과) = 항상 펼침: 버튼 없이 전량 렌더.
//   - SortableContext items = 렌더된(보이는) 칩만. SortableContext는 조 컨테이너 안에 위치.
import { useState } from 'react'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import { Chip } from './Chip.jsx'

// 2행 기준 (명세 5절: 2행 초과 시 접힘). 한 행 ≈ 4칩(720px 기준) 잡음 → 8개 초과 = 3행.
// 검증 5: 컴팩트(640px 이하)에서 칩 9개인 조 = '펼치기 ▾' 표시, 8개 이하 = 버튼 없음.
const COLLAPSE_LIMIT = 8

export function ZoneList({ zone, label, chips, onAdd, onRemove, onCycle, compact, open, onToggleOpen }) {
  const [adding, setAdding] = useState(false)
  const [text, setText] = useState('')

  const zoneChips = chips.filter((c) => c.zone === zone)
  // 컴팩트 + 접힘(기본)이면 2행분(8개)만 렌더. 데스크톱·펼침은 전량.
  const collapsed = compact && !open && zoneChips.length > COLLAPSE_LIMIT
  const visibleChips = collapsed ? zoneChips.slice(0, COLLAPSE_LIMIT) : zoneChips
  const showToggle = compact && zoneChips.length > COLLAPSE_LIMIT

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
          {zone} {label}
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

      <div className="zone__chips">
        <SortableContext
          id={`zone-${zone}`}
          items={visibleChips.map((c) => c.name)}
          strategy={rectSortingStrategy}
        >
          {visibleChips.map((c) => (
            <Chip key={c.name} chip={c} onRemove={onRemove} onCycle={onCycle} />
          ))}
        </SortableContext>
      </div>

      {showToggle && (
        <div className="zone__fold">
          <button type="button" className="zone__fold-btn" onClick={onToggleOpen}>
            {open ? '접기 ▴' : `펼치기 ▾ (${zoneChips.length - COLLAPSE_LIMIT})`}
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
