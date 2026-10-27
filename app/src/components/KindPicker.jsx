// KindPicker.jsx — v1.2 신설 (명세 5절)
// 위치: 화면 하단, 레시피 추천 버튼 바로 위. 체크박스 5종, 다중 선택, 기본 전부 미선택.
// 재료에는 종류 태그를 붙이지 않는다 (chip 레코드에 kind 없음).
// 선택 상태(kinds)는 App의 화면 상태이고 localStorage에 저장하지 않는다 (승인 3 → 새로고침 시 미선택 복귀).

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
