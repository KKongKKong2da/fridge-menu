// M2: 조 3개 + +(기타) 인라인 입력 + 최근바 클릭 추가 + 칩 색 사이클
// M3: DndContext 연결 (전역 SortableContext + 센서 3종) — 검증 13
//     렌더 순서 = chips의 블록 순서(조 첫 등장 순서). 조 헤더 드래그로 조 순서도 바뀜.
//     dragOver = 미리보기(화면만 재정렬), dragEnd = storage.moveByDragState로 영속.
// M4: 추천 버튼 + ResultCard(프롬프트/복사/4발판) — 검증 8~12 (프롬프트는 영속 chips 기준 live 계산)
import { useCallback, useState } from 'react'
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import { useFridge } from './hooks/useFridge.js'
import { ZONE_LABELS } from './data/materials.js'
import { blocksFromFlat, moveByDragState, renderItems, SENSOR_OPTIONS } from './lib/storage.js'
import { ZoneList } from './components/ZoneList.jsx'
import { RecentBar } from './components/RecentBar.jsx'
import { ResultCard } from './components/ResultCard.jsx'
import { buildPrompt } from './lib/prompt.js'

export default function App() {
  const { chips, recent, removedDefaults, addChip, removeChip, cycleChip, pickRecent, applyDrag } =
    useFridge()
  const [customOpen, setCustomOpen] = useState(false)
  const [customText, setCustomText] = useState('')
  const [preview, setPreview] = useState(null) // M3: 드래그 중 미리보기 전용 (드래그 아니면 null)
  const [showCard, setShowCard] = useState(false) // M4 검증 8~9: 추천을 누른 뒤 결과 카드 표시

  const view = preview ?? chips // 화면에 띄울 칩 = 미리보기가 있으면 그것

  // 렌더 순서 = 블록 순서 (조 첫 등장 순서) + 빈 custom 헤더는 항상 마지막 (renderItems 규칙과 동일)
  const zonesToRender = blocksFromFlat(view).map((b) => b.zone)
  if (!zonesToRender.includes('custom')) zonesToRender.push('custom')

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: SENSOR_OPTIONS.mouse.activationConstraint }),
    useSensor(TouchSensor, { activationConstraint: SENSOR_OPTIONS.touch.activationConstraint }),
    useSensor(KeyboardSensor)
  )

  const submitCustom = () => {
    const name = customText.trim()
    if (name === '') return
    addChip(name, 'custom') // +(기타) = zone "custom" 칩
    setCustomText('')
    setCustomOpen(false)
  }

  // 검증 13 (dragEnd): active/over를 storage 블록 규칙에 위임 -> 순서 영속 (검증 14: LS 복원)
  const handleDragStart = useCallback(
    () => {
      setPreview((cur) => cur ?? chips) // 드래그 시작 시점 = 현재 영속 순서를 미리보기 기준으로
    },
    [chips]
  )

  const handleDragOver = useCallback(({ active, over }) => {
    if (!over || active.id === over.id) return
    setPreview((cur) => {
      const base = cur ?? chips
      const next = moveByDragState({ chips: base, recent: [] }, active.id, over.id).chips
      return next === base ? cur : next
    })
  }, [chips])

  const handleDragEnd = useCallback(
    ({ active, over }) => {
      setPreview(null)
      if (over && active.id !== over.id) applyDrag(active.id, over.id)
    },
    [applyDrag]
  )

  const handleDragCancel = useCallback(() => setPreview(null), [])

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">냉장고 재료 · 메뉴 추천</h1>
        <p className="app__hint">
          칩 클릭 = 검정 → 파랑(쓸 재료) → 빨강(임박+꼭 쓸) · ×로 삭제 · ＋로 추가 · 길게 눌러 드래그
          정렬 (PC 6px / 모바일 0.45초)
        </p>
        <div className="legend">
          <span className="chip chip--s0 legend__chip">검정: 보유 후보</span>
          <span className="chip chip--s1 legend__chip">파랑: 주역 재료</span>
          <span className="chip chip--s2 legend__chip">빨강: 임박+필수</span>
        </div>
      </header>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <main className="app__zones">
          <SortableContext items={renderItems(view)} strategy={rectSortingStrategy}>
            {zonesToRender.map((zone) => (
              <ZoneList
                key={zone}
                zone={zone}
                label={zone === 'custom' ? '기타' : ZONE_LABELS[zone]}
                chips={view}
                recent={recent}
                removedDefaults={removedDefaults}
                onAdd={addChip}
                onRemove={removeChip}
                onCycle={cycleChip}
              />
            ))}
          </SortableContext>

          <RecentBar
            recent={recent}
            onOpenCustom={() => setCustomOpen((v) => !v)}
            onPick={pickRecent}
          />

          {customOpen && (
            <div className="zone__input zone__input--custom">
              <input
                type="text"
                className="zone__input-box"
                placeholder="기타 재료 이름 (Enter) — 예: 라면, 우유, 냉동만두"
                value={customText}
                autoFocus
                onChange={(e) => setCustomText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    submitCustom()
                  }
                  if (e.key === 'Escape') {
                    setCustomOpen(false)
                    setCustomText('')
                  }
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
        </main>
      </DndContext>

      {/* M4: [레시피 추천] 버튼 + 결과 카드 (명세서 8절 배치: 체크 영역 아래) */}
      <section className="app__recommend">
        <button
          type="button"
          className="recommend-btn"
          onClick={() => setShowCard(true)}
        >
          레시피 추천
        </button>
        {/* 검증 8: 파랑·빨강 0개면 ResultCard가 빈 메시지 표시 / 검증 9~12 */}
        {showCard && <ResultCard prompt={buildPrompt(chips)} />}
      </section>

      <footer className="app__footer">
        <p className="app__footer-note">
          칩 {chips.length}개 · 파랑 {chips.filter((c) => c.state === 1).length} ·
          빨강 {chips.filter((c) => c.state === 2).length} · 현재 M4 (배포 M5)
        </p>
      </footer>
    </div>
  )
}