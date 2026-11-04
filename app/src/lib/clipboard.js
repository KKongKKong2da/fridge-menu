// lib/clipboard.js — 클립보드 복사 단일 구현 (순수 함수, React 무관)
// navigator.clipboard 없거나 비보안 컨텍스트면 textarea+execCommand 폴백 (ResultCard·MigrationNotice 공용)
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    try {
      document.execCommand('copy')
      return true
    } catch {
      return false
    } finally {
      document.body.removeChild(ta)
    }
  }
}
