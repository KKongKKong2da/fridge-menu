냉장고 재료 메뉴 추천 웹앱 — 변경사항 v1.5.2
작성일: 2026-10-28 | 기준: v1.5.1 라이브(커밋 92978ff) | 상태: 확정 → 구현 → 배포
저장 위치: C:\Users\PRINCESS-PC\Documents\fridge-menu\CHANGES_v1.5.2.md

================================================================
0. 요청 5건과 처리
================================================================
① 드래그 양방향 (앞에 있는 칩을 뒤로 못 보내는 문제)
   - 원인: App.jsx handleDragEnd의 `if (overId === dragName) return`.
     dnd-kit 정렬은 드래그 중 빈자리를 앞 칩이 채우므로, 칩을 뒤로 보내면 over가
     "자기 원위치"로 착지한다 → 그 가드가 드롭을 통째로 무효화 → 뒤로 보내기 불가 체감.
     moveChipState 자체는 fromIndex/targetIndex 비교로 양방향 정상 (수정하지 않음).
   - 해결: 가드 제거. 자기 자신 target 드롭은 moveChipState가 같은 객체를 반환(no-op)하여
     useFridge의 applyDrag가 원본 반환으로 판단 → 상태·저장 변경 없음. (검증 9-2c)
     → 뒤로(from<target)·앞으로(from>target) 양방향 드롭 정상. (검증 9-2a / 9-2b)
     조 간 드롭 무이동(명세 4)은 moveChipState가 zone 비교로 계속 방어. (검증 4 유지)

② verify/v14-out.txt 삭제 → git rm (루트 잔존물 정리)

③ 접기/펼치기 버튼: ＋ 버튼과 동일 크기 + 내용 ▼/▲만
   - ZoneList.jsx: 텍스트 라벨 제거 → {open ? '▼' : '▲'} (aria-label·title에는 '펼치기/접기' 유지)
   - styles.css .zone__fold-btn: 44×44 스펙 폐기 → .zone__add와 동일
     (border 1.5px accent · border-radius 8px · font-size 15px · line-height 1 · padding 6px 11px)
     → 세로 30px = 모두 선택/해제(.batch-btn 7+15+7 = 29px)와 시각적으로 동일, ＋ 버튼과 완전 동일.

④ 모두 해제 버튼 = 회색
   - App.jsx: className="batch-btn batch-btn--off"
   - styles.css: .batch-btn--off(+active) { background: var(--off-deep); border-color: var(--off-deep);
     color: #fff }  → 회색(#6b7280) 채움 + 흰 글자. "모두 선택"은 파랑 테두리 유지 (대조).

⑤ 칩 회색 연한화
   - styles.css: --off: #6b7280 → #9ca3af (gray-400) / --off-deep: #4b5563 → #6b7280
   - 칩 chip--s0과 탭 사이클의 회색이 자동 반영. 저장 상태 값 0은 그대로 (스키마 무변경).
   -副作用 안내: 회색 = "프롬프트 제외" 식별이 기존보다 옅어짐 → (n/m) 카운트로 보완.

================================================================
1. 그 외 (무변경)
================================================================
- 센서 분리(Mouse 5px / Touch 1500·10), 접힘 자격(scrollHeight > 74+4), (n/m), 1.05 스케일,
  pan-y 인라인, 150ms, 프롬프트 2줄·전량 67종, 복사·Google, fridge-chips:v4, var 금지, vite base.

================================================================
2. 수정 파일
================================================================
- src/App.jsx            : 가드 제거(handleDragEnd) / batch-btn--off 클래스 / footer v1.5.2 / 주석
- src/components/ZoneList.jsx: ▼/▲ 기호만 + title 추가 / 주석 v1.5.2 (판정 로직 그대로)
- src/styles.css         : --off/--off-deep 교체 · .batch-btn--off 신설 · .zone__fold-btn 스펙 교체
- src/components/Chip.jsx, src/hooks/useFridge.js, index.html, lib/storage.js : 무변경
- verify/v15-logic-test.mjs: 4-5·4-7 기준 갱신 + 섹션9 (9-1, 9-2a/b/c, 9-3~9-6) → 42건
- verify/poll-deploy.mjs : 라이브 체크 기준을 v1.5.2 문자열(#9ca3af / fridge-chips:v4)로 교체
- verify/v14-out.txt (루트) 삭제
- CHANGES_v1.5.2.md 신설

================================================================
3. 검증
================================================================
node verify/v15-logic-test.mjs → 42건 ALL PASS
  (① 9-1 가드 제거·9-2a 뒤로 0→8·9-2b 앞으로 9→0·9-2c no-op 안전
   ③ 4-7 44×44 폐기+zone__add 동일 padding·9-5 기호만  ④ 9-3  ⑤ 9-4)
node verify/var-scan.mjs → 12개 파일 PASS (var 0 · window 0 · export 중복 0 · 신규 라이브러리 0 · 한글 정상)
vite build → 44 modules ✓ (index-BrJM6WVM.js / index-DWO6ALqT.css)
→ push → Actions → 라이브 200 (Ctrl+F5)
