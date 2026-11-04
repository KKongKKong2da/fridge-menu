// lib/prompt.js — v1.6.2: 검색 프롬프트 생성 (순수 문자열 함수, node 검증: verify/v162)
// · 빨강(임박)과 파랑(선택)을 역할 분리: 1줄 = 임박 필수 사용 / 2줄 = 임박 사용 후 파랑 일부
// · 빨강 없으면 파랑 한 줄(1.6 문구), 회색은 어느 줄에도 없음, 재료 0개 = null (빈 메시지)
// · 마지막에 조미료 상시 줄 + 종류 선택 시에만 종류 줄, 접힘 무관 chips 전량 사용

export const RED_LEAD = '반드시 사용해야 하는 임박 재료: ' // ① 임박 = 필수 사용 (빨강 전용)
export const BLUE_LEAD_AFTER_RED = '위의 임박 재료를 꼭 쓰고, 아래 재료들 일부로 만들 수 있는 레시피를 추천해줘: ' // ② 파랑 (빨강이 있을 때)
export const RED_ONLY_LINE = '위의 임박 재료만으로 만들 수 있는 레시피를 추천해줘' // ② 파랑이 없을 때
export const BLUE_LEAD_PLAIN = '다음의 냉장고 속 재료들 일부로 만들 수 있는 레시피를 추천해줘: ' // ① 파랑 (빨강이 없을 때, 1.6 문구 유지)

export const SEASONING_LINE = '소스, 오일, 조미료, 장류 모두 보유' // v1.4 (명세 4절, 상시)

export const PROMPT_EMPTY_MSG = '쓸 재료를 파랑/빨강으로 표시해주세요'

export const BULLET = '· '

// 역할 분리 (v1.6.2): 빨강(임박)과 파랑(선택)을 각각 화면 순서로
function redNames(chips) {
  return chips.filter((c) => c.state === 2).map((c) => c.name)
}

function blueNames(chips) {
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
