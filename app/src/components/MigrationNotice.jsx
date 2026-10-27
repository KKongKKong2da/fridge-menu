// MigrationNotice.jsx — v1.4 (명세 3절, v1.3 (a) 방식 유지)
// v4 저장 키(fridge-chips:v4)가 없고 레거시 키(v1~v3)가 있는 최초 실행에만 표시.
// 안내 + [기존 데이터 복사] 버튼(v1.3 chips JSON 클립보드) + [초기화 시작] 버튼.
// [초기화 시작] 클릭 → confirmMigration(): 67종 파랑 확정 저장 + 레거시·recent·fridge-open-zones 삭제 + 안내 닫힘.
// clipboard API가 없으면 textarea 폴백(ResultCard와 동일한 패턴).
import { useState } from 'react'

export function MigrationNotice({ getLegacyJson, onConfirm }) {
  const [copied, setCopied] = useState(false)

  const flashCopied = () => {
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  const copyLegacy = async () => {
    const json = getLegacyJson()
    if (!json) return
    try {
      await navigator.clipboard.writeText(json)
      flashCopied()
    } catch {
      const ta = document.createElement('textarea')
      ta.value = json
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
    <section className="migration" aria-label="저장 데이터 초기화 안내">
      <p className="migration__title">새 버전(67종 재료)으로 초기화합니다</p>
      <p className="migration__body">
        지금까지 저장된 재료 목록이 비고, 기본 67종이 모두 파랑으로 채워집니다.
        남겨두고 싶은 목록이라면 아래 버튼으로 먼저 복사해두세요.
      </p>
      <div className="migration__row">
        <button type="button" className="migration__copy" onClick={copyLegacy}>
          {copied ? '✓ 복사됨' : '기존 데이터 복사'}
        </button>
        <button type="button" className="migration__go" onClick={onConfirm}>
          초기화 시작
        </button>
      </div>
    </section>
  )
}
