// App.jsx — v1.5.1 (명세 1~3절 + 전수검사 규칙)
// 화면: 헤더(타이틀 + ⓘ 2문장 설명) → [모두 선택][모두 해제] → 조 7개(각 조 끝 ＋, 접기/펼치기)
//       → 종류 체크박스 5종 → [레시피 추천] → 결과 카드
// v1.5.1 변화 (사용자 요청: 칩 이동 불가 + 접기 소멸):
//   - 드래그 센서 분리 (v1.5 단일 PointerSensor delay 1500는 활성화 불안정 → 폐기):
//       MouseSensor { distance: 5 }                → PC: 눌른 채 5px 이동 = 즉시 드래그
//       TouchSensor { delay: 1500, tolerance: 10 } → 모바일: 1.5초 꾹 = 들림(iPhone 방식),
//                                                    10px 선행 이동 = 드래그 취소 → 스크롤 양보
//       KeyboardSensor 없음.
//   - 접기 기능 복원: ZoneList의 자격 판정을 scrollHeight > 2행(74px)+4 로 바꿔
//       펼쳐진 상태에서도 접기 ▲ 버튼이 사라지지 않음 (v1.5는 clientHeight 비교로 펼침 후 버튼 소멸)
//   - 접힘 = ZoneList 래퍼 높이 연산 (max-height 2행 + 자격 판정), 640px 이하 = compact
//   - 조 헤더 (n/m) 참여 카운트 (ZoneList 파생 계산)
//   - 펼침 상태 = openZones(fridge-open-zones) / 프롬프트는 compact·openZones 무관 chips 전량 (유지)
//   - footer 표기 v1.5.1로 갱신
// kinds(종류)는 화면 상태 전용 — localStorage 비저장 (v1.2 승인 3 유지)
import { useCallback, useEffect, useState } from 'react'
import { DndContext, MouseSensor, TouchSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import { useFridge } from './hooks/useFridge.js'
import { ZONE_LABELS, ZONE_ORDER } from './data/materials.js'
import { buildPrompt } from './lib/prompt.js'
import { ZoneList } from './components/ZoneList.jsx'
import { KindPicker } from './components/KindPicker.jsx'
import { ResultCard } from './components/ResultCard.jsx'
import { MigrationNotice } from './components/MigrationNotice.jsx'

// 명세 5절 1안: 640px 이하(모바일)에서만 접기/펼치기 발동
const COMPACT_QUERY = '(max-width: 640px)'

// matchMedia 감시 → 640px 이하 여부 (데스크톱: 항상 펼침)
// window. 접두사 없이 전역 matchMedia 호출 (var-scan window 0건 규칙 유지, 명세 6절)
function useCompact() {
  const [compact, setCompact] = useState(false) // 첫 렌더는 펼쳐진 상태로, 마운트 직후 보정
  useEffect(() => {
    const mq = matchMedia(COMPACT_QUERY)
    const onChange = (event) => setCompact(event.matches)
    onChange(mq) // 마운트 시점 판정 (모바일면 이 후부터 접힘 적용)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return compact
}

export default function App() {
  const {
    chips,
    migrationNeeded,
    openZones,
    confirmMigration,
    getLegacyJson,
    addChip,
    removeChip,
    cycleChip,
    selectAll,
    selectNone,
    toggleOpen,
    applyDrag,
  } = useFridge()

  const compact = useCompact() // 검증 5: 640px 이하 발동
  const [kinds, setKinds] = useState([]) // 화면 상태만 (localStorage와 무관)
  const [showCard, setShowCard] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false) // 검증 8: 설명 기본 접힘

  // 명세 1절 (v1.5.1): 입력 장치별 센서 분리 — PC는 드래그, 모바일은 롱프레스
  //   MouseSensor: 마우스는 눌림 즉시 감지 → 5px 이동하면 드래그 시작 (PC 드래그 이동 정상화)
  //   TouchSensor: 손가락은 1500ms 꾹 누름 동안 보류 → 그 사이 10px 이상 움직이면 취소(스크롤 양보),
  //                1500ms 정지 유지 시 들림(iPhone 홈화면 방식). 짧은 탭은 클릭(색 사이클)으로 남음.
  const mouseSensor = useSensor(MouseSensor, { activationConstraint: { distance: 5 } })
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 1500, tolerance: 10 },
  })
  const sensors = useSensors(mouseSensor, touchSensor) // KeyboardSensor 없음 (명세 1절)

  const toggleKind = (kind) =>
    setKinds((cur) => (cur.includes(kind) ? cur.filter((k) => k !== kind) : [...cur, kind]))

  // 검증 3·4: 드래그 종료 → 같은 조 안 순서만 변경. 다른 조 over는 moveChipState가 무이동 처리
  const handleDragEnd = useCallback(
    ({ active, over }) => {
      if (!over) return
      const dragName = String(active.id)
      const overId = String(over.id)
      if (overId === dragName) return
      applyDrag(dragName, overId)
    },
    [applyDrag]
  )

  // 검증 6·7: 추천 클릭 시점의 chips+kinds로 3줄 생성 (접힘 무관 전량)
  const handleRecommend = () => {
    setShowCard(true)
  }

  return (
    <div className="app">
      <header className="app__header">
        {/* 명세 2절: 타이틀 + ⓘ 토글 (설명은 기본 접힘) */}
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
            쓸 재료는 파랑, 임박 재료는 빨강입니다. 칩을 길게 눌러 순서를 바꿀 수 있어요.
          </p>
        )}
        {/* 범례 라인: v1.4 폐지 (명세 2절) */}

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

      {/* 검증 3·4: 드래그는 조 안 정렬만 (조 간 over = 무이동) */}
      <main className="app__zones">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          {ZONE_ORDER.map((zone) => (
            <ZoneList
              key={zone}
              zone={zone}
              label={ZONE_LABELS[zone]}
              chips={chips}
              onAdd={addChip}
              onRemove={removeChip}
              onCycle={cycleChip}
              compact={compact}
              open={openZones.includes(zone)}
              onToggleOpen={() => toggleOpen(zone)}
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
        <p className="app__footer-note">v1.5.1 · 7개 조 67종 · 솔리드 칩 · PC 5px 드래그 · 모바일 1.5초 롱프레스 · 640px 이하 2행 접기/펼치기 · 조 안 드래그</p>
      </footer>
    </div>
  )
}
