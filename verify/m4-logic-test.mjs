// M4 검증 (케이스 8~12) + M1/M2/M3 회귀 — prompt.js 순수 로직 시뮬레이션
// 실행: node verify\m4-logic-test.mjs  (fridge-menu 폴더에서)
import {
  PROMPT_PREFIX,
  PROMPT_EMPTY_MSG,
  selectedNames,
  buildPrompt,
  buildSearchUrls,
  LLM_URLS,
} from '../app/src/lib/prompt.js'
import { loadState, cycleChipState, addChipState, removeChipState, moveByDragState } from '../app/src/lib/storage.js'

const mkLS = (seed = {}) => {
  const store = { ...seed }
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v) },
    _dump: () => store,
  }
}

const results = []
const record = (id, title, pass, detail) => results.push({ id, title, pass, detail })

// 케이스 8: 파랑·빨강 0개(첫 실행 전체 검정) -> null + 빈 메시지
{
  const s = loadState(mkLS())
  const p = buildPrompt(s.chips)
  record(8, '추천 (파랑·빨강 0)', p === null && PROMPT_EMPTY_MSG === '쓸 재료를 파랑/빨강으로 표시해주세요',
    `prompt=${p === null ? 'null' : '오류'} 메시지='${PROMPT_EMPTY_MSG}'`)
}

// 케이스 9: 파랑2 + 빨강1 -> 화면 순서대로, 파랑/빨강만
{
  const ls = mkLS()
  let s = loadState(ls)
  s = cycleChipState(s, '삼겹살')                 // 파랑
  s = cycleChipState(s, '양파')                    // 파랑
  s = addChipState(s, '우유', 'custom').state      // 검정(직접입력)
  s = cycleChipState(s, '우유')                    // 파랑
  s = cycleChipState(s, '우유')                    // 빨강 (우유=파랑+빨강 순환 끝에 빨강)
  // 파랑: 삼겹살, 양파 / 빨강: 우유 / 검정: 나머지 35종(양파 포함X)
  const names = selectedNames(s.chips)
  const p = buildPrompt(s.chips)
  const blackCount = s.chips.filter((c) => c.state === 0).length
  const ok =
    p === `${PROMPT_PREFIX}삼겹살, 양파, 우유` &&
    names.join(',') === '삼겹살,양파,우유' && // 화면(배열) 순서 그대로
    !names.includes('대파') && blackCount === 36 // 39종 - 파랑2 - 빨강1 = 검정 36
  record(9, '추천 (파랑2+빨강1)', ok, `프롬프트='${p}' 나열순서=[${names}] 검정${blackCount}종 미포함=${!names.includes('대파')}`)
}

// 케이스 9-b: 드래그로 순서 바꾼 뒤 프롬프트 = 새 화면 순서 (검증 13과 연계)
{
  const ls = mkLS()
  let s = loadState(ls)
  s = cycleChipState(s, '양파')
  s = cycleChipState(s, '대파')
  s = moveByDragState(s, '양파', '대파') // 양파를 대파 앞으로 -> 파랑 나열 = 양파, 대파 (기본은 대파<양파)
  const names = selectedNames(s.chips)
  const p = buildPrompt(s.chips)
  record('9-b', '드래그 순서 -> 프롬프트 순서', names.join(',') === '양파,대파' && p.endsWith('양파, 대파'),
    `나열=[${names}] 프롬프트 끝='${p.slice(PROMPT_PREFIX.length)}'`)
}

// 케이스 10(일부): 복사 대상 = 개행 없는 한 줄 문자열 (writeText에 넘길 값 사전 검증)
{
  const ls = mkLS()
  let s = loadState(ls)
  s = cycleChipState(s, '삼겹살'); s = cycleChipState(s, '대파')
  const p = buildPrompt(s.chips)
  const single = !/[\r\n]/.test(p) && p.startsWith(PROMPT_PREFIX)
  record(10, '복사 대상 한 줄', single, `개행없음=${!/[\r\n]/.test(p)} 길이=${p.length}`)
}

// 케이스 11: Google/네이버 = 인코딩된 검색 URL (프롬프트 전체가 q/query 파라미터에)
{
  const ls = mkLS()
  let s = loadState(ls)
  s = cycleChipState(s, '삼겹살')
  const p = buildPrompt(s.chips)
  const urls = buildSearchUrls(p)
  const q = encodeURIComponent(p)
  const ok =
    urls.google === `https://www.google.com/search?q=${q}` &&
    urls.naver === `https://search.naver.com/search.naver?query=${q}` &&
    urls.google.includes(encodeURIComponent('삼겹살')) &&
    urls.naver.includes(encodeURIComponent('레시피'))
  record(11, 'Google/네이버 URL', ok, `google=${urls.google.slice(0, 58)}… naver=${urls.naver.slice(0, 52)}…`)
}

// 케이스 12: Gemini/Claude = 사이트 URL 상수 (복사 버튼은 ResultCard — 브라우저 영역)
{
  const ok =
    LLM_URLS.gemini === 'https://gemini.google.com/app' &&
    LLM_URLS.claude === 'https://claude.ai/new'
  record(12, 'Gemini/Claude 사이트', ok, `gemini=${LLM_URLS.gemini} claude=${LLM_URLS.claude}`)
}

// M1/M2/M3 회귀: 파손 -> 38종, 사이클, 삭제 후 프롬프트 (删除 포함)
{
  const { STORAGE_KEY } = await import('../app/src/lib/storage.js')
  const broken = mkLS({ [STORAGE_KEY]: 'not-json' })
  const fresh = loadState(broken)
  let s = fresh
  s = cycleChipState(s, '참치')
  s = removeChipState(s, '참치') // 참치 삭제 -> 프롬프트 대상 아님
  const pAfter = buildPrompt(s.chips)
  record('M1~M3회귀', '파손복구·사이클·삭제-프롬프트',
    fresh.chips.length === 38 && pAfter === null,
    `파손복구=${fresh.chips.length}종 삭제후prompt=${pAfter === null ? 'null' : '오류'}`)
}

let allPass = true
console.log('| # | 케이스 | 판정 | 근거 |')
console.log('|---|--------|------|------|')
for (const r of results) {
  allPass = allPass && r.pass
  console.log(`| ${r.id} | ${r.title} | ${r.pass ? 'PASS' : 'FAIL'} | ${r.detail} |`)
}
console.log(allPass ? 'ALL PASS' : 'SOME FAIL')
