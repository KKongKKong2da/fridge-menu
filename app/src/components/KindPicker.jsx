// KindPicker.jsx — 종류 체크박스 5종(간단/식사/안주/브런치/디저트), 다중 선택 기본 미선택
// · kinds는 App 화면 상태만 — localStorage 저장 안 함 (새로고침 시 미선택 복귀)

export const KIND_OPTIONS = ['간단', '식사', '안주', '브런치', '디저트']

export function KindPicker({ kinds, onToggle }) {
  return (
    <div className="kind-picker" role="group" aria-label="레시피 종류 선택">
      {KIND_OPTIONS.map((kind) => (
        <label key={kind} className="kind-picker__item">
          <input
            type="checkbox"
            checked={kinds.includes(kind)}
            onChange={() => onToggle(kind)}
          />
          {kind}
        </label>
      ))}
    </div>
  )
}
