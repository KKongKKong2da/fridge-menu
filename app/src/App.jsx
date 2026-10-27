// App.jsx — v1.3 (명세 3·4·5·8절 + 전수검사 규칙 9절)
// 화면: 헤더(타이틀 + ⓘ 토글 설명) → [모두 선택][모두 해제] → 조 6개(각 조 끝 ＋)
//       → 종류 체크박스 5종 → [레시피 추천] → 결과 카드
// v1.3 변화:
//   - 자동 이동 폐기에 따른 문구 제거, 범례 "검정" → "회색" 표기 (상태 값 0 유지)
//   - 헤더: 설명 2줄 삭제 + "냉장고 재료 · 메뉴 추천 ⓘ" (ⓘ 클릭/터치로 펼침/접힘, 기본 접힘)
//   - 드래그 복구: DndContext(MouseSensor distance 8 / TouchSensor delay 300 tolerance 5)
//       조 안 자유 정렬 + 조 간 이동(zone 변경) + 빈 조 드롭(그 조 마지막)
//   - 마이그레이션 안내(MigrationNotice): v1.2 저장 데이터 존재 시 1회 표시
//   - 화면 순서 = 저장 순서 = 프롬프트 나열 순서 (단일 소스)
// kinds(종류)는 화면 상태 전용 — localStorage 비저장 (v1.2 승인 3 유지)
import { useCallback, useState } from 'react'
import { DndContext, MouseSensor, TouchSensor, pointerWithin, useSensor, useSensors } from '@dnd-kit/core'
import { useFridge } from './hooks/useFridge.js'
import { ZONE_LABELS, ZONE_ORDER } from './data/materials.js'
import { buildPrompt } from './lib/prompt.js'
import { ZoneList } from './components/ZoneList.jsx'
import { KindPicker } from './components/KindPicker.jsx'
import { ResultCard } from './components/ResultCard.jsx'
import { MigrationNotice } from './components/MigrationNotice.jsx'

const ZONE_PREFIX = 'zone-'

export default function App() {
  const {
    chips,
    migrationNeeded,
    confirmMigration,
    getLegacyJson,
    addChip,
    removeChip,
    cycleChip,
    selectAll,
    selectNone,
    applyDrag,
  } = useFridge()

  const [kinds, setKinds] = useState([]) // 화면 상태만 (localStorage와 무관)
  const [showCard, setShowCard] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false) // 검증 8: 설명 기본 접힘

  const mouseSensor = useSensor(MouseSensor, { activationConstraint: { distance: 8 } })
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 300, tolerance: 5 }, // 검증 5: 300ms 미만 탭 = 사이클
  })
  const sensors = useSensors(mouseSensor, touchSensor)

  const toggleKind = (kind) =>
    setKinds((cur) => (cur.includes(kind) ? cur.filter((k) => k !== kind) : [...cur, kind]))

  // 검증 5·6: 드래그 종료 → 순서·zone 변경 (드롭한 자리에 삽입)
  const handleDragEnd = useCallback(
    ({ active, over }) => {
      if (!over) return
      const dragName = String(active.id)
      const overId = String(over.id)
      if (overId === dragName) return
      if (overId.startsWith(ZONE_PREFIX)) {
        const zone = Number(overId.slice(ZONE_PREFIX.length))
        const target = chips.filter((c) => c.zone === zone)
        if (target.length === 0) {
          applyDrag(dragName, null, zone) // 빈 조 = 그 조의 마지막 칩으로 이동
        } else {
          applyDrag(dragName, target[target.length - 1].name) // 조 끝(마지막 칩 뒤)에 삽입
        }
        return
      }
      applyDrag(dragName, overId) // 조 내 자유 정렬 / 조 간 이동(chip.zone 변경)
    },
    [applyDrag, chips]
  )

  // 검증 11~17: 추천 클릭 시점의 chips+kinds로 3줄 생성 (회색만 있으면 null → 빈 메시지)
  const handleRecommend = () => {
    setShowCard(true)
  }

  return (
    <div className="app">
      <header className="app__header">
        {/* 명세 4절: 타이틀 + ⓘ 토글 (설명은 기본 접힘) */}
        <h1 className="app__title">
          냉장고 재료 · 메뉴 추천{' '}
          <button
            type="button"
            className="info-btn"
            aria-expanded={helpOpen}
            aria-label="설명 펼침/접힘"
            onClick={() => setHelpOpen((v) => !v)}
          >
            ⓘ
          </button>
        </h1>
        {helpOpen && (
          <p className="app__help">
            냉장고 문을 열듯 재료를 고르고, 쓸 재료는 파랑으로, 빨리 소비해야 하는 재료는 빨강으로 바꿔주세요.
            회색은 이번 추천에서 빼는 재료예요. 칩을 길게 눌러 원하는 자리로 옮기고, 조 사이도 옮겨 다닐 수 있어요.
          </p>
        )}

        {/* 범례 한 줄: v1.3 표기 = 파랑/빨강/회색 (구 검정 → 회색) */}
        <p className="legend">
          <span className="legend__item">
            <span className="chip chip--s1 chip--mini">파랑</span> 쓸 재료
          </span>
          <span className="legend__item">
            <span className="chip chip--s2 chip--mini">빨강</span> 임박+최우선
          </span>
          <span className="legend__item">
            <span className="chip chip--s0 chip--mini">회색</span> 후보 제외
          </span>
        </p>

        {/* 명세 5절 일괄 버튼: 조 목록 위 한 줄, 화면 우측 */}
        <div className="app__batch">
          <button type="button" className="batch-btn" onClick={selectAll}>
            모두 선택
          </button>
          <button type="button" className="batch-btn" onClick={selectNone}>
            모두 해제
          </button>
        </div>
      </header>

      {migrationNeeded && <MigrationNotice getLegacyJson={getLegacyJson} onConfirm={confirmMigration} />}

      {/* 검증 5·6: 드래그로 조 안 순서 + 조 간 이동 (순서·zone 즉시 저장) */}
      <main className="app__zones">
        <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragEnd={handleDragEnd}>
          {ZONE_ORDER.map((zone) => (
            <ZoneList
              key={zone}
              zone={zone}
              label={ZONE_LABELS[zone]}
              chips={chips}
              onAdd={addChip}
              onRemove={removeChip}
              onCycle={cycleChip}
            />
          ))}
        </DndContext>
      </main>

      {/* 명세 5절: 종류 체크박스 → 레시피 추천 버튼 바로 위 */}
      <section className="app__recommend">
        <KindPicker kinds={kinds} onToggle={toggleKind} />
        <button type="button" className="recommend-btn" onClick={handleRecommend}>
          레시피 추천
        </button>
        {showCard && <ResultCard prompt={buildPrompt(chips, kinds)} />}
      </section>

      <footer className="app__footer">
        <p className="app__footer-note">v1.3 · 6개 조 63종 · 드래그 복구 · 상태 전환은 위치 그대로</p>
      </footer>
    </div>
  )
}
