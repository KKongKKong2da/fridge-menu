// ZoneList.jsx — v1.2
// 조 1개 = 헤더(번호 + 이름 + ＋) + 칩 목록 + ＋ 클릭 시 인라인 입력창 (Enter로 그 조에 파랑 칩)
// v1.1의 useSortable/드래그 핸들(⠿)/사용 카운트 배지/제안 바(recent·removedDefaults) 전면 제거
// (드래그 폐기, 최근·제안 바 폐지, 승인 4: 카운트 배지 제거)
// 빈 조(기타 포함) = 헤더와 ＋만 표시.

import { useState } from 'react'
import { Chip } from './Chip.jsx'

export function ZoneList({ zone, label, chips, onAdd, onRemove, onCycle }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')

  const zoneChips = chips.filter((c) => c.zone === zone)

  const submit = () => {
    const name = text.trim()
    if (name === '') return
    onAdd(name, zone) // 검증 8: Enter로 그 조에 파랑 칩 (기타 조 4도 동일) / 검증 9: 중복 방지
    setText('')
    setOpen(false)
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
          onClick={() => setOpen((v) => !v)}
        >
          ＋
        </button>
      </div>

      <div className="zone__chips">
        {zoneChips.map((c) => (
          <Chip key={c.name} chip={c} onRemove={onRemove} onCycle={onCycle} />
        ))}
      </div>

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
