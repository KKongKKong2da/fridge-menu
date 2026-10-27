// ZoneList.jsx — v1.3
// 조 1개 = 헤더(번호 + 이름 + ＋) + 드래그 가능한 칩 목록 + ＋ 클릭 시 인라인 입력창
//   (Enter로 "입력한 조"에 파랑 칩 — v1.3: 원래 조 복원 규칙 폐기, +(기타) 버튼 없음)
// 빈 조(칩 0개) = 헤더와 ＋만 표시. droppable이라 칩을 드롭하면 그 조의 마지막 칩이 된다 (검증 6).
// SortableContext(rectSortingStrategy)로 조 안 정렬을 지원하고,
// 컨테이너 자체는 useDroppable(id=`zone-N`)으로 조 간 드롭/빈 조 드롭을 받는다.
import { useState } from 'react'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { Chip } from './Chip.jsx'

export function ZoneList({ zone, label, chips, onAdd, onRemove, onCycle }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const { setNodeRef, isOver } = useDroppable({ id: `zone-${zone}`, data: { zone } })

  const zoneChips = chips.filter((c) => c.zone === zone)

  const submit = () => {
    const name = text.trim()
    if (name === '') return
    onAdd(name, zone) // 검증 8: Enter로 입력한 조에 파랑 칩 / 검증 9: 중복 방지
    setText('')
    setOpen(false)
  }

  return (
    <section
      ref={setNodeRef}
      className={`zone${isOver ? ' zone--over' : ''}`}
      data-zone={zone}
    >
      <div className="zone__header">
        <span className="zone__title">
          {zone} {label}
        </span>
        <button
          type="button"
          className="zone__add"
          aria-label={`${label} 조 재료 추가`}
          onClick={() => setOpen((v) => !v)}
        >
          ＋
        </button>
      </div>

      <SortableContext
        id={`zone-${zone}`}
        items={zoneChips.map((c) => c.name)}
        strategy={rectSortingStrategy}
      >
        <div className="zone__chips">
          {zoneChips.map((c) => (
            <Chip key={c.name} chip={c} onRemove={onRemove} onCycle={onCycle} />
          ))}
        </div>
      </SortableContext>

      {open && (
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
                setOpen(false)
                setText('')
              }
            }}
          />
        </div>
      )}
    </section>
  )
}
