// M4: 결과 카드 (명세서 8절) — 프롬프트 한 줄 + [복사] + 4발판
// 검증 8: prompt가 null(파랑·빨강 0개)이면 "쓸 재료를 파랑/빨강으로 표시해주세요"만 표시
// 검증 10: [복사] = navigator.clipboard.writeText(한 줄, 개행/공백 없음) + "복사됨" 피드백
//         clipboard API 없거나 http 환경이면 textarea 폴백 (execCommand)
// 검증 11: Google/네이버 = URL에 프롬프트 인코딩 -> 새 탭 즉시 검색
// 검증 12: Gemini/Claude = 사이트 새 탭 + [복사]로 사용자가 붙여넣기
import { useState } from 'react'
import { PROMPT_EMPTY_MSG, buildSearchUrls, LLM_URLS } from '../lib/prompt.js'

export function ResultCard({ prompt }) {
  const [copied, setCopied] = useState(false)

  if (!prompt) {
    return (
      <section className="result-card result-card--empty">
        <p className="result-card__msg">{PROMPT_EMPTY_MSG}</p>
      </section>
    )
  }

  const urls = buildSearchUrls(prompt)

  const flashCopied = () => {
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt)
      flashCopied()
    } catch {
      // clipboard API 불가 환경(비보안 컨텍스트 등) -> textarea로 한 줄 그대로 복사
      const ta = document.createElement('textarea')
      ta.value = prompt
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      try { document.execCommand('copy'); flashCopied() } catch { /* 클립보드 불가: 피드백 없이 종료 */ }
      document.body.removeChild(ta)
    }
  }

  return (
    <section className="result-card">
      <p className="result-card__label">검색 프롬프트 (한 줄)</p>
      <p className="result-card__prompt">{prompt}</p>

      <div className="result-card__row">
        <button type="button" className="result-card__copy" onClick={copy} aria-label="프롬프트 복사">
          {copied ? '✓ 복사됨' : '복사'}
        </button>
      </div>

      <div className="result-card__links">
        {/* 검증 11: 클릭 즉시 검색 결과 */}
        <a className="launch-btn launch-btn--search" href={urls.google} target="_blank" rel="noreferrer">
          Google
        </a>
        <a className="launch-btn launch-btn--search" href={urls.naver} target="_blank" rel="noreferrer">
          네이버
        </a>
        {/* 검증 12: 사이트 열기 -> [복사]한 프롬프트 붙여넣기 */}
        <a className="launch-btn launch-btn--llm" href={LLM_URLS.gemini} target="_blank" rel="noreferrer">
          Gemini
        </a>
        <a className="launch-btn launch-btn--llm" href={LLM_URLS.claude} target="_blank" rel="noreferrer">
          Claude
        </a>
      </div>
      <p className="result-card__hint">Google/네이버는 클릭 즉시 결과 · Gemini/Claude는 [복사] 후 붙여넣기</p>
    </section>
  )
}
