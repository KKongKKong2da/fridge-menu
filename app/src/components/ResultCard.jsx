// ResultCard.jsx — v1.2 (명세 6·7절)
// 3줄 전문: 재료 / 조미료(상시) / 종류(선택 시). 줄바꿈 유지, 줄마다 · (검증 13: 첫 줄+둘째 줄 분리 렌더)
// 발판 2개만: [복사] = 3줄 전문을 그대로 클립보드(navigator.clipboard.writeText + textarea 폴백 유지)
//             [Google] = 전문 전체(줄바꿈 포함) URL 인코딩 → 클릭 한 번으로 Google 검색 + AI 답변 (검증 17)
// v1.1의 네이버/Gemini/Claude 버튼·LLM_URLS·hint 문구 제거 (발판 2개 축소).
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
      <p className="result-card__label">검색 프롬프트 (3줄)</p>
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
