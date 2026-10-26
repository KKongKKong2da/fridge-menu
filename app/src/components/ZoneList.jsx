// 조 1개 = 헤더(⠿ 드래그 핸들 + 이름 + 사용 카운트 + ＋) + 칩 목록 + ＋ 클릭 시 인라인 입력창
// M3: 조 헤더 = 드래그 유닛(id = `zone:${zone}` = storage ZONE_ID 규칙), 조 안 칩 = 같은 SortableContext의 유닛
//     - 유닛 registration을 위해 ZoneSortable를 모듈 최상위 컴포넌트로 분리
//       (ZoneList 안에 중첩 정의하면 렌더마다 컴포넌트 신원이 바뀌어
//        입력창 포커스/드래그 트랜지션이 깨짐 -> M3 검증 3·13에 치명적)
import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Chip } from './Chip.jsx'

function ZoneSortable({ zone, label, chips, recent, removedDefaults, onAdd, onRemove, onCycle }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `zone:${zone}`, // storage.js의 ZONE_ID(zone)과 동일 형식 (검증 13-b/13-c)
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 2 : 1,
    opacity: isDragging ? 0.6 : 1,
  }

  const zoneChips = chips.filter((c) => c.zone === zone)
  const usedCount = zoneChips.filter((c) => c.state > 0).length

  const submit = () => {
    const name = text.trim()
    if (name === '') return
    onAdd(name, zone) // 중복이면 훅에서 기존 칩 유지 (검증 5)
    setText('')
    setOpen(false)
  }

  return (
    <section ref={setNodeRef} style={style} className="zone" data-zone={zone}>
      {/* 헤더가 드래그 핸들: 헤더를 잡아야 조 블록 통째로 이동 (칩/입력창/＋는 핸들 밖) */}
      <div
        className={`zone__header${isDragging ? ' zone__header--dragging' : ''}`}
        {...attributes}
        {...listeners}
      >
        <span className="zone__drag-handle" aria-label={`${label} 조 순서 변경 (드래그)`}>⠿</span>
        <span className="zone__title">
          {zone === 'custom' ? '' : `${zone} `}{label}
          {usedCount > 0 && <span className="zone__count">{usedCount}</span>}
        </span>
        <button
          type="button"
          className="zone__add"
          aria-label={`${label} 조 재료 추가`}
          onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}
          onPointerDown={(e) => e.stopPropagation()} // ＋ 누름이 헤더 드래그로 시작되지 않게
        >
          ＋
        </button>
      </div>

      <div className="zone__chips">
        {zoneChips.map((c) => (
          <Chip key={c.name} chip={c} onRemove={onRemove} onCycle={onCycle} />
        ))}
        {zoneChips.length === 0 && <span className="zone__empty">재료 없음 · ＋로 추가</span>}
      </div>

      {open && (
        <div className="zone__input" onPointerDown={(e) => e.stopPropagation()}>
          <input
            type="text"
            className="zone__input-box"
            placeholder={`${label} 재료 이름 (Enter)`}
            value={text}
            autoFocus
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation() // 조 헤더의 KeyboardSensor와 충돌 방지
              if (e.key === 'Enter') { e.preventDefault(); submit() }
              if (e.key === 'Escape') { setOpen(false); setText('') }
            }}
          />
          {recent.length + removedDefaults.length > 0 && (
            <div className="zone__suggest">
              <span className="zone__suggest-label">제안:</span>
              {[...recent, ...removedDefaults].map((name) => (
                <span key={name} className="suggest-chip">{name}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

// 얇은 래퍼: ZoneList 이름/시그니처 유지 (App.jsx의 props 그대로 전달)
export function ZoneList(props) {
  return <ZoneSortable {...props} />
}
