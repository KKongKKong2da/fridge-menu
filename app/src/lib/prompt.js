// ============================================================
// lib/prompt.js — M4: 검색 프롬프트 생성 (명세서 6절 템플릿 확정)
//   "다음의 냉장고 속 재료들 일부로 만들 수 있는 레시피를 추천해줘: 닭다리살, 달걀, 우유"
// - 재료 나열 = 파랑(state 1) + 빨강(state 2) 칩만, 배열 순서(= 화면/드래그 순서) 그대로
// - 검정(state 0) 칩은 넣지 않는다
// - 한 줄 문자열 (개행 없음) → 복사(Google/네이버 검색 인코딩) 전부 이 결과에서 파생
// - 이 모듈은 순수 문자열 함수 -> node로 검증 가능 (verify/m4-logic-test.mjs)
// ============================================================

export const PROMPT_PREFIX = '다음의 냉장고 속 재료들 일부로 만들 수 있는 레시피를 추천해줘: '

export const PROMPT_EMPTY_MSG = '쓸 재료를 파랑/빨강으로 표시해주세요' // 검증 8

// 검증 9: 파랑+빨강만, 화면 순서대로 "닭다리살, 달걀, 우유"
export function selectedNames(chips) {
  return chips.filter((c) => c.state === 1 || c.state === 2).map((c) => c.name)
}

// 파랑+빨강 0개(검증 8) -> null (App에서 PROMPT_EMPTY_MSG 표시)
export function buildPrompt(chips) {
  const names = selectedNames(chips)
  if (names.length === 0) return null
  return `${PROMPT_PREFIX}${names.join(', ')}`
}

// 검증 11: 클릭 즉시 검색 결과가 열리는 URL (쿼리 = 프롬프트 전체, URL 인코딩)
export function buildSearchUrls(prompt) {
  const q = encodeURIComponent(prompt)
  return {
    google: `https://www.google.com/search?q=${q}`,
    naver: `https://search.naver.com/search.naver?query=${q}`,
  }
}

// 검증 12: 사이트만 열고, 프롬프트는 [복사] 버튼으로 사용자가 붙여넣기
export const LLM_URLS = {
  gemini: 'https://gemini.google.com/app',
  claude: 'https://claude.ai/new',
}
