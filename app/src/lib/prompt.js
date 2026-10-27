// ============================================================
// lib/prompt.js — v1.4: 검색 프롬프트 생성 (명세 4절 확정)
// 결과 카드에 3줄로 분리 표시, 줄마다 글머리 ·
//   · 다음의 냉장고 속 재료들 일부로 만들 수 있는 레시피를 추천해줘: (재료 나열)
//   · 소스, 오일, 조미료, 장류 모두 보유                            ← v1.4 (상시)
//   · 종류: A, B  ← 종류를 고른 경우에만 (미선택 시 줄 통째 생략)
// - 재료 나열 = 파랑(state 1) + 빨강(state 2) 칩만, chips 배열 순서(= 화면 순서)
// - 회색(state 0) 칩은 넣지 않는다.
// - 접기/펼치기와 무관 (명세 5절): chips 배열 그대로 전량 사용. 접힘 = 화면 정리일 뿐.
// - 발판 2개 유지: [복사] = 3줄 전문(줄바꿈 유지) 클립보드 / [Google] = 전문 전체 URL 인코딩
// - 순수 문자열 함수 -> node로 검증 가능 (verify/v14-logic-test.mjs)
// ============================================================

export const PROMPT_PREFIX = '다음의 냉장고 속 재료들 일부로 만들 수 있는 레시피를 추천해줘: '

export const SEASONING_LINE = '소스, 오일, 조미료, 장류 모두 보유' // v1.4 (명세 4절)

export const PROMPT_EMPTY_MSG = '쓸 재료를 파랑/빨강으로 표시해주세요'

export const BULLET = '· '

// 검증 6·7: 파랑+빨강만, chips 배열 순서(= 화면 순서) 그대로 — 접힘 무관
export function selectedNames(chips) {
  return chips.filter((c) => c.state === 1 || c.state === 2).map((c) => c.name)
}

// 줄 단위 배열 (렌더는 각 줄을 <p>로 분리 → 첫 줄+둘째 줄 합쳐지지 않음)
// 재료 0개면 null (App/ResultCard가 PROMPT_EMPTY_MSG 표시)
export function buildLines(chips, kinds = []) {
  const names = selectedNames(chips)
  if (names.length === 0) return null
  const lines = [`${PROMPT_PREFIX}${names.join(', ')}`, SEASONING_LINE]
  const picked = (kinds || []).filter(Boolean)
  if (picked.length > 0) lines.push(`종류: ${picked.join(', ')}`) // 미선택 시 셋째 줄 생략
  return lines
}

// 3줄 전문 (줄바꿈 유지). 복사·Google 인코딩의 단일 소스 (검증 10)
export function buildPrompt(chips, kinds = []) {
  const lines = buildLines(chips, kinds)
  if (!lines) return null
  return lines.map((l) => `${BULLET}${l}`).join('\n')
}

// 검증 10: 클릭 한 번으로 Google 검색 실행 — 전문 전체를 그대로 인코딩 (줄바꿈 포함)
export function buildGoogleUrl(prompt) {
  return `https://www.google.com/search?q=${encodeURIComponent(prompt)}`
}
