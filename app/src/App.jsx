// App.jsx — v1.6.3 (화면 조립 전용)
// · 드래그 정합성 3단계: 착지 번역(translateContainerTarget) → 저장(moveChipState) → 화면 스냅샷(computeSnapshotMove),
//   셋 모두 lib/storage.js의 동일한 arrayMove 시맨틱 → 화면=저장=새로고침 순서 항상 일치
// · dnd-kit items는 App 소유 스냅샷(드롭 확정 시에만 갱신) — 미리보기 transform 원복 방지 (v1.6.1)
// · 센서: Mouse distance 5(PC 즉시) / Touch delay LONG_PRESS_MS(모바일 600ms 꾹) — useLongPressDrag가 단일 소스
// · 640px 이하(matchMedia)에서만 조 접기 발동, 종류(kinds)·카드·설명 접힘은 화면 상태(localStorage 무관)
// · 파일 내 구분자 join은 String.fromCharCode(0x2022) 사용 (NUL 문자 금지 — 소스 파손 방지)
import { useCallback, useEffect, useRef, useState } from 'react'
import { DndContext, MouseSensor, TouchSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import { useFridge } from './hooks/useFridge.js'
import { useLongPressDrag, LONG_PRESS_MS } from './hooks/useLongPressDrag.js'
import { ZONE_LABELS, ZONE_ORDER } from './data/materials.js'
import { buildPrompt } from './lib/prompt.js'
// v1.6.3: 순서 연산은 저장 로직(lib/storage.js) 단일 소스만 사용 — 저장과 화면이 같은 함수로 움직인다
import { translateContainerTarget, computeSnapshotMove } from './lib/storage.js'
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

// 조별 정렬 스냅샷 계산: 칩 배열 → { [zone]: [이름...] }
function zoneNames(chips) {
  const map = {}
  for (const z of ZONE_ORDER) map[z] = chips.filter((c) => c.zone === z).map((c) => c.name)
  return map
}

const JOIN = String.fromCharCode(0x2022) // 조별 순서 대조용 구분자 (NUL 문자 사용 금지 — 파일 파손 방지)

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

  // v1.6.1 [핵심] dnd-kit SortableContext items의 "기준 스냅샷"을 App이 소유.
  //   드롭 확정 시점에만 새 순서로 갱신 → dnd-kit이 미리보기 transform을 원본으로 리셋하는 일이 없다.
  const [snapshot, setSnapshot] = useState(() => zoneNames(chips))
  const snapshotRef = useRef(snapshot) // 최신 스냅샷 (드롭 판정·저장·갱신의 단일 기준)
  const syncSnapshot = useCallback((next) => {
    snapshotRef.current = next
    setSnapshot(next)
  }, [])

  // 저장/초기화 이벤트로 스냅샷을 현재 chips 순서에 동기화
  //   - 마이그레이션 확인(67종 초기화) / 칩 추가·삭제 / 앱 재마운트(localStorage 순서)
  //   - 드래그로 확정된 순서는 handleDragEnd에서 이미 스냅샷에 반영되므로 이 효과는 무변경 유지.
  useEffect(() => {
    const now = zoneNames(chips)
    const cur = snapshotRef.current
    for (const z of ZONE_ORDER) {
      if (cur[z].join(JOIN) !== now[z].join(JOIN)) {
        syncSnapshot(now)
        return
      }
    }
  }, [chips, syncSnapshot])

  // 명세 1절 (v1.6): 입력 장치별 센서 분리 — PC는 눌림 즉시(5px), 모바일은 600ms 꾹 누름
  const mouseSensor = useSensor(MouseSensor, { activationConstraint: { distance: 5 } })
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: LONG_PRESS_MS, tolerance: 10 },
  })
  const sensors = useSensors(mouseSensor, touchSensor) // KeyboardSensor 없음 (명세 1절)
  const longPress = useLongPressDrag() // v1.6: live/lastEnd 추적 → Chip 클릭 차단 참조

  const toggleKind = (kind) =>
    setKinds((cur) => (cur.includes(kind) ? cur.filter((k) => k !== kind) : [...cur, kind]))

  // 검증 3·4 + v1.6.3: 드롭 확정 = ①컨테이너 착지 번역 → ②저장 → ③스냅샷 갱신.
  //   세 단계가 모두 같은 arrayMove 시맨틱을 따르므로 화면·저장·새로고침 순서가 항상 일치한다.
  //   (state updater 안에서 부작용을 부르지 않도록 ref 기준으로 순차 실행)
  const handleDragEnd = useCallback(
    ({ active, over }) => {
      longPress.onDragEnd() // v1.6 검증 5: 종료 시각 기록 → Chip 클릭 봉인 (lastEnd)
      const from = String(active.id)
      if (!over) return
      const to = translateContainerTarget(snapshotRef.current, from, over.id) // v1.6.3: 'zone-N' → 그 조 마지막 칩
      applyDrag(from, to) // 저장 (no-op면 원본 그대로 = 정상)
      syncSnapshot(computeSnapshotMove(snapshotRef.current, from, to)) // 화면 기준 갱신 (저장과 동일 시맨틱)
    },
    [applyDrag, syncSnapshot, longPress]
  )

  // 검증 6·7: 추천 클릭 시점의 chips+kinds로 전문 생성 (접힘 무관 전량, v1.6.2 임박 필수화)
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
          <button type="button" className="batch-btn batch-btn--off" onClick={selectNone}>
            모두 해제
          </button>
        </div>
      </header>

      {migrationNeeded && <MigrationNotice getLegacyJson={getLegacyJson} onConfirm={confirmMigration} />}

      {/* 검증 3·4: 드래그는 조 안 정렬만 (조 간 over = 무이동) */}
      <main className="app__zones">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={longPress.onDragStart}
          onDragEnd={handleDragEnd}
        >
          {/* v1.6.3: onDragEnd는 handleDragEnd (내부에서 longPress.onDragEnd를 먼저 호출 → 봉인 기록 + 저장/스냅샷) */}
          {ZONE_ORDER.map((zone) => (
            <ZoneList
              key={zone}
              zone={zone}
              label={ZONE_LABELS[zone]}
              chips={chips}
              items={snapshot[zone]}
              onAdd={addChip}
              onRemove={removeChip}
              onCycle={cycleChip}
              compact={compact}
              open={openZones.includes(zone)}
              onToggleOpen={() => toggleOpen(zone)}
              longPressRef={longPress.stateRef}
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
        <p className="app__footer-note">v1.6.3 · 7개 조 67종 · 솔리드 칩 · 양방향 드래그(PC 즉시/모바일 600ms 꾹) · 640px 이하 2행 접기/펼치기(▼▲) · 회색 --gray 통일 · 여백 드롭 = 그 조 맨 뒤 · 임박 재료는 꼭 사용</p>
      </footer>
    </div>
  )
}
