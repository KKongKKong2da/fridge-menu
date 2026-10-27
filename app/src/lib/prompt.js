// ============================================================
// lib/prompt.js — v1.2: 검색 프롬프트 생성 (명세 6·7절 확정)
// 결과 카드에 3줄로 분리 표시, 줄마다 글머리 ·
//   · 다음의 냉장고 속 재료들 일부로 만들 수 있는 레시피를 추천해줘: (재료 나열)
//   · 소금, 설탕, 간장, 식초, 참기름, 고춧가루, 후춧가루 등 기본 조미료는 모두 보유하고 있어.  ← 상시
//   · 종류: A, B  ← 종류를 고른 경우에만
// - 재료 나열 = 파랑(state 1) + 빨강(state 2) 칩만, chips 배열 순서(조 1→4, 조 안 왼쪽→오른쪽)
// - 검정(state 0) 칩은 넣지 않는다.
// - 발판 2개 (v1.2): [복사] = 3줄 전문(줄바꿈 유지) 클립보드 / [Google] = 전문 전체 URL 인코딩
// - 순수 문자열 함수 -> node로 검증 가능 (verify/v12-logic-test.mjs)
// ============================================================

export const PROMPT_PREFIX = '다음의 냉장고 속 재료들 일부로 만들 수 있는 레시피를 추천해줘: '

export const SEASONING_LINE =
  '소금, 설탕, 간장, 식초, 참기름, 고춧가루, 후춧가루 등 기본 조미료는 모두 보유하고 있어.'

export const PROMPT_EMPTY_MSG = '쓸 재료를 파랑/빨강으로 표시해주세요' // 검증 11

export const BULLET = '· '

// 검증 12: 파랑+빨강만, chips 배열 순서(= 화면 순서) 그대로
export function selectedNames(chips) {
  return chips.filter((c) => c.state === 1 || c.state === 2).map((c) => c.name)
}

// 줄 단위 배열 (렌더는 각 줄을 <p>로 분리 → 첫 줄+둘째 줄 합쳐지지 않음, 검증 13)
// 재료 0개면 null (App/ResultCard가 PROMPT_EMPTY_MSG 표시, 검증 11)
export function buildLines(chips, kinds = []) {
  const names = selectedNames(chips)
  if (names.length === 0) return null
  const lines = [`${PROMPT_PREFIX}${names.join(', ')}`, SEASONING_LINE]
  const picked = (kinds || []).filter(Boolean)
  if (picked.length > 0) lines.push(`종류: ${picked.join(', ')}`) // 검증 14(미선택=생략)·15(다중선택)
  return lines
}

// 3줄 전문 (줄바꿈 유지). 복사·Google 인코딩의 단일 소스 (검증 16·17)
export function buildPrompt(chips, kinds = []) {
  const lines = buildLines(chips, kinds)
  if (!lines) return null
  return lines.map((l) => `${BULLET}${l}`).join('\n')
}

// 검증 17: 클릭 한 번으로 Google 검색 실행 — 3줄 전문 전체를 그대로 인코딩 (줄바꿈 포함)
export function buildGoogleUrl(prompt) {
  return `https://www.google.com/search?q=${encodeURIComponent(prompt)}`
}
