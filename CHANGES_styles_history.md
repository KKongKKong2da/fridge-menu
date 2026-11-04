# styles.css 버전 히스토리

styles.css 상단 주석에서 이관함 (git 커밋 로그가 각 버전 상세 보관).

============================================================
   styles.css — 냉장고 재료 메뉴 추천 (v1.6, 단일 CSS 파일)
   v1.6 회색 통일 (명세 2절): 회색은 단일 변수 --gray 한 값(연한 회색 #9ca3af)만 사용.
     --off / --off-deep 2종 폐기 → 회색 칩(chip--s0)·펼침▼·접기▲(.zone__fold-btn--gray)·
     모두 해제(batch-btn--off)가 모두 --gray를 참조 (한 곳에서 정의, 모두 참조).
     --muted(문구 작은 회색)는 문구 색이라 회색 4종 대상 아님.
   칩 = 솔리드 스타일 (명세 1절)
     배경: 상태색 100% 채움 (opacity 1) / 테두리: 없음 / 글자: 흰색 #fff
     chip--s1 파랑 #2563eb = 쓸 재료(기본)
     chip--s2 빨강 #dc2626 = 임박
     chip--s0 회색 #6b7280 = 후보 제외 (상태 값 0 유지)
     x 버튼: 흰색, hover 시 배경과 동일 계열 어두운 색
   v1.5.2 (5건 요청):
     - ① 양방향 드래그: App handleDragEnd의 자기 자신 가드 제거 (JS 측)
     - ③ 접기/펼치기 버튼: ▼/▲ 기호만 + ＋ 버튼과 동일 크기 (44×44·텍스트 라벨 폐기)
     - ④ 모두 해제 버튼 = 회색 채움 (batch-btn--off, --off-deep)
     - ⑤ 칩 회색 연한화 --off #9ca3af / hover --off-deep #6b7280
   v1.5.1 (핫픽스):
     - 센서 분리 (JS 측): MouseSensor distance 5 (PC 드래그) + TouchSensor delay 1500/tol 10 (모바일 롱프레스)
     - 접기 버튼: 자격 판정 = scrollHeight > 74+4 (콘텐츠 높이) → 펼친 조도 "접기 ▲" 유지 (JS 측)
   v1.5 (CHANGES_v1.5.md):
     - 롱프레스 1500ms 드래그 = App의 PointerSensor 1종 (delay 1500 / tol 10, JS 측)
     - touch-action: 칩은 JS가 조작 (기본 pan-y → 드래그 활성화 시에만 none) → CSS 상시 지정 없음
     - 접힘 = ZoneList 래퍼 높이 연산 (max-height 74px + overflow hidden, JS 인라인) → CSS 규칙 없음
     - 펼침 라벨 "펼치기 ▼ / 접기 ▲" (숫자 없음), 터치 타깃 44×44px (zone__fold-btn)
     - chip--dragging: 스케일 1.05(JS transform) + 그림자(CSS) + z-index 50(JS)
   v1.4 유지: info-btn/app__help(2문장), migration, batch-btn, kind-picker, result-card, transition 150ms(JS)
   v1.4 삭제 유지: 범례(legend·chip--mini), zone--over(조 간 드롭 폐지)
   ============================================================
