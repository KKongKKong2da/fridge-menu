// ResultCard.jsx — 검색 프롬프트 카드 (3~5줄) + 발판 2개 [복사]( 전문 클립보드, textarea 폴백) /
// [Google]( 전문 전체 URL 인코딩 → 클릭 1회 검색+AI)
import { useState } from 'react'
import { PROMPT_EMPTY_MSG, buildGoogleUrl } from '../lib/prompt.js'

export function ResultCard({ prompt }) {
  const [copied, setCopied] = useState(false)

  // 검증 11: 파랑·빨강 0개(prompt null) → 빈 메시지
  if (!prompt) {
    return (
      <section className="result-card result-card--empty">
        <p className="result-card__msg">{PROMPT_EMPTY_MSG}</p>
      </section>
    )
  }

  const flashCopied = () => {
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  // 검증 16: 3줄 전문(줄바꿈 유지)을 그대로 클립보드에 복사.
  // clipboard API 없거나 비보안 컨텍스트면 textarea 폴백(execCommand)으로 같은 원문 복사.
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt)
      flashCopied()
    } catch {
      const ta = document.createElement('textarea')
      ta.value = prompt
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand('copy')
        flashCopied()
      } catch {
        /* 클립보드 불가 환경: 피드백 없이 종료 */
      }
      document.body.removeChild(ta)
    }
  }

  return (
    <section className="result-card">
      <p className="result-card__label">검색 프롬프트 (임박 재료는 꼭 사용하도록 분리됨)</p>
      <div className="result-card__lines">
        {/* 각 줄을 별도 <p>로 → 화면에서 절대 합쳐지지 않음 (검증 13) */}
        {prompt.split('\n').map((line, i) => (
          <p key={i} className="result-card__line">
            {line}
          </p>
        ))}
      </div>

      <div className="result-card__row">
        <button type="button" className="result-card__copy" onClick={copy} aria-label="프롬프트 복사">
          {copied ? '✓ 복사됨' : '복사'}
        </button>
        {/* 검증 17: 3줄 전문 전체가 검색어로 실린 Google 검색 결과 + AI 답변 */}
        <a className="launch-btn" href={buildGoogleUrl(prompt)} target="_blank" rel="noreferrer">
          Google
        </a>
      </div>
    </section>
  )
}
