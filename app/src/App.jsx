// App.jsx — v1.2 (명세 9절 파일 구조 기준)
// 화면: [모두 선택][모두 해제] → 조 4개(각 조 끝 ＋) → 종류 체크박스 5종 → [레시피 추천] → 결과 카드
// v1.1 제거: DndContext/SortableContext/센서/preview, +(기타) 인라인 입력, RecentBar, 사용 카운트
// v1.2 신설: 일괄 버튼 2종, KindPicker, 결과 카드는 3줄 + 복사/Google 2발판
// kinds(종류)는 화면 상태 전용 — localStorage 비저장 (승인 3, 새로고침 시 미선택 복귀)
import { useState } from 'react'
import { useFridge } from './hooks/useFridge.js'
import { ZONE_LABELS, ZONE_ORDER } from './data/materials.js'
import { buildPrompt } from './lib/prompt.js'
import { ZoneList } from './components/ZoneList.jsx'
import { KindPicker } from './components/KindPicker.jsx'
import { ResultCard } from './components/ResultCard.jsx'

export default function App() {
  const { chips, addChip, removeChip, cycleChip, selectAll, selectNone } = useFridge()
  const [kinds, setKinds] = useState([]) // 화면 상태만 (localStorage와 무관)
  const [showCard, setShowCard] = useState(false)

  const toggleKind = (kind) =>
    setKinds((cur) => (cur.includes(kind) ? cur.filter((k) => k !== kind) : [...cur, kind]))

  // 검증 11~17: 추천 클릭 시점의 chips+kinds로 3줄 생성 (검정만 있으면 null → 빈 메시지)
  const handleRecommend = () => {
    setShowCard(true)
  }

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">냉장고 재료 · 메뉴 추천</h1>
        {/* 검증 2 + 명세 3절 표: 한 줄 범례 (승인 4) */}
        <p className="legend">
          <span className="legend__item">
            <span className="chip chip--s1 chip--mini">파랑</span> 쓸 재료
          </span>
          <span className="legend__item">
            <span className="chip chip--s2 chip--mini">빨강</span> 임박+최우선
          </span>
          <span className="legend__item">
            <span className="chip chip--s0 chip--mini">검정</span> 후보 제외
          </span>
        </p>
        <p className="app__hint">
          칩 클릭 = 파랑 → 빨강 → 검정 순환 · 빨강은 그 조 맨 앞, 검정은 그 조 맨 뒤로 이동
        </p>

        {/* 명세 3절 일괄 버튼: 조 목록 위 한 줄, 화면 우측 */}
        <div className="app__batch">
          <button type="button" className="batch-btn" onClick={selectAll}>
            모두 선택
          </button>
          <button type="button" className="batch-btn" onClick={selectNone}>
            모두 해제
          </button>
        </div>
      </header>

      <main className="app__zones">
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
        <p className="app__footer-note">v1.2 · 조 단위 자동 이동 · 드래그/최근바 폐기</p>
      </footer>
    </div>
  )
}
