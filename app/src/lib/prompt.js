// ============================================================
// lib/prompt.js — v1.6.2: 검색 프롬프트 생성 (임박 = 꼭 사용해야 하는 재료로 명시)
// [고치는 것] 명세 4절의 기존 규칙은 빨강(임박)과 파랑을 한 줄에 섞어
//   "일부로 만들 수 있는 레시피"라고만 보냈다. 그래서 "임박 = 꼭 써야 한다"는 뜻이
//   검색 프롬프트에 전혀 전달되지 않았다 → 빨강을 별도 줄로 분리해 필수 사용으로 명시한다.
//
// [줄 구성 (색 상태가 결정, 순서는 chips 배열 = 화면 순서)]
//   빨강 O / 파랑 O:  ① · 반드시 사용해야 하는 임박 재료: (빨강)
//                     ② · 위의 임박 재료를 꼭 쓰고, 아래 재료들 일부로 만들 수 있는 레시피를 추천해줘: (파랑)
//   빨강 O / 파랑 X:  ① · 반드시 사용해야 하는 임박 재료: (빨강)
//                     ② · 위의 임박 재료만으로 만들 수 있는 레시피를 추천해줘
//   빨강 X / 파랑 O:  ① · 다음의 냉장고 속 재료들 일부로 만들 수 있는 레시피를 추천해줘: (파랑)
//   마지막:           · 소스, 오일, 조미료, 장류 모두 보유          (v1.4 상시)
//                     · 종류: A, B                                 (고른 경우에만)
// - 재료를 두 줄에 중복 나열하지 않는다 (빨강은 1줄, 파랑은 2줄).
// - 회색(state 0) 칩은 어느 줄에도 넣지 않는다.
// - 접기/펼치기와 무관 (명세 5절): chips 배열 그대로 전량 사용.
// - 발판 2개 유지: [복사] = 전문(줄바꿈 유지) 클립보드 / [Google] = 전문 전체 URL 인코딩
// - 순수 문자열 함수 -> node로 검증 가능 (verify/v162-logic-test.mjs)
// ============================================================

export const RED_LEAD = '반드시 사용해야 하는 임박 재료: ' // ① 임박 = 필수 사용 (빨강 전용)
export const BLUE_LEAD_AFTER_RED = '위의 임박 재료를 꼭 쓰고, 아래 재료들 일부로 만들 수 있는 레시피를 추천해줘: ' // ② 파랑 (빨강이 있을 때)
export const RED_ONLY_LINE = '위의 임박 재료만으로 만들 수 있는 레시피를 추천해줘' // ② 파랑이 없을 때
export const BLUE_LEAD_PLAIN = '다음의 냉장고 속 재료들 일부로 만들 수 있는 레시피를 추천해줘: ' // ① 파랑 (빨강이 없을 때, 1.6 문구 유지)

export const SEASONING_LINE = '소스, 오일, 조미료, 장류 모두 보유' // v1.4 (명세 4절, 상시)

export const PROMPT_EMPTY_MSG = '쓸 재료를 파랑/빨강으로 표시해주세요'

export const BULLET = '· '

// 역할 분리 (v1.6.2): 빨강(임박)과 파랑(선택)을 각각 화면 순서로
export function redNames(chips) {
  return chips.filter((c) => c.state === 2).map((c) => c.name)
}

export function blueNames(chips) {
  return chips.filter((c) => c.state === 1).map((c) => c.name)
}

// 빈 메시지 판정용 (검증 11): 파랑+빨강 0개
export function selectedNames(chips) {
  return chips.filter((c) => c.state === 1 || c.state === 2).map((c) => c.name)
}

// 줄 단위 배열 (렌더는 각 줄을 <p>로 분리 → 합쳐지지 않음)
// 재료 0개면 null (App/ResultCard가 PROMPT_EMPTY_MSG 표시)
export function buildLines(chips, kinds = []) {
  const reds = redNames(chips)
  const blues = blueNames(chips)
  if (reds.length === 0 && blues.length === 0) return null

  const lines = []
  if (reds.length > 0) {
    lines.push(`${RED_LEAD}${reds.join(', ')}`)
    lines.push(blues.length > 0 ? `${BLUE_LEAD_AFTER_RED}${blues.join(', ')}` : RED_ONLY_LINE)
  } else {
    lines.push(`${BLUE_LEAD_PLAIN}${blues.join(', ')}`) // 빨강 없음 → 1.6처럼 파랑 한 줄
  }
  lines.push(SEASONING_LINE)
  const picked = (kinds || []).filter(Boolean)
  if (picked.length > 0) lines.push(`종류: ${picked.join(', ')}`) // 미선택 시 마지막 줄 생략
  return lines
}

// 전문 (줄바꿈 유지). 복사·Google 인코딩의 단일 소스 (검증 10)
export function buildPrompt(chips, kinds = []) {
  const lines = buildLines(chips, kinds)
  if (!lines) return null
  return lines.map((l) => `${BULLET}${l}`).join('\n')
}

// 검증 10: 클릭 한 번으로 Google 검색 실행 — 전문 전체를 그대로 인코딩 (줄바꿈 포함)
export function buildGoogleUrl(prompt) {
  return `https://www.google.com/search?q=${encodeURIComponent(prompt)}`
}
