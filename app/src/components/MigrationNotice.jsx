// MigrationNotice.jsx — v4 키 없고 레거시(v1~v3) 있는 최초 실행 안내
// [기존 데이터 복사](레거시 JSON 클립보드, ResultCard와 동일 폴백) + [초기화 시작](confirmMigration)
import { useState } from 'react'
import { copyText } from '../lib/clipboard.js'

export function MigrationNotice({ getLegacyJson, onConfirm }) {
  const [copied, setCopied] = useState(false)

  const flashCopied = () => {
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  const copyLegacy = async () => {
    const json = getLegacyJson()
    if (!json) return
    if (await copyText(json)) flashCopied()
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
