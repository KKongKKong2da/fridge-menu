냉장고 재료 메뉴 추천 웹앱 — 변경사항 v1.5.1 (핫픽스)
작성일: 2026-10-27 | 기준: v1.5 라이브(커밋 065d200) | 상태: 확정 → 구현 → 배포
저장 위치: C:\Users\PRINCESS-PC\Documents\fridge-menu\CHANGES_v1.5.1.md

================================================================
0. 고친 두 증상 (사용자 보고)
================================================================
① 칩 이동 불가
   - v1.5는 PointerSensor 1종 + activationConstraint { delay: 1500 }에 전량 의존했다.
     dnd-kit는 "지연(delay)" 센서 활성화 중 포인터이벤트를 consume·prevent하기 때문에
     activator가 <button>인 구조와 combination이 불안정하여 활성화 자체가 드문 사례가 있었다
     → PC·모바일 모두 칩이 안 들렸다.
   - [해결] 입력 장치별 센서 분리 (v1.4 검증 경로 + v1.5 롱프레스 값의 결합)
       MouseSensor { distance: 5 }                → PC: 클릭-유지 5px 이동 시 즉시 드래그 (지연 없음)
       TouchSensor { delay: 1500, tolerance: 10 } → 모바일: 1.5초 꾹 → 들림(iPhone 방식),
                                                    10px 선행 이동 = 취소 → 스크롤에 넘김
       KeyboardSensor 없음.
       짧은 탭 = 색 사이클 (센서는 클릭을 막지 않음).
② 펼치기 후 접기 버튼 소멸
   - v1.5 판정: overflow = scrollHeight > clientHeight + 4.
     조가 펼쳐지면 max-height가 제거되어 clientHeight = 전체 콘텐츠 높이 → 판정 false
     → "펼치기 ▼ / 접기 ▲" 버튼 자체가 사라졌다 (접기 불가).
   - [해결] 자격 판정을 콘텐츠 높이 비교로 교체:
       qualifies = scrollHeight > 74(2행) + 4
       scrollHeight는 overflow:max-height의 영향을 받지 않으므로 접힘/펼침 양쪽에서 동일한 값
       → 펼쳐진 조도 qualifies 유지 → "접기 ▲" 버튼 계속 표시.
       버튼 표시 조건 = compact(640px 이하) && qualifies (open과 무관).

================================================================
1. 그 외 규칙 (v1.5에서 변화 없음)
================================================================
- 접힘: 래퍼 max-height 74px + overflow hidden (JS 인라인), 640px 이하 발동, 데스크톱 항상 펼침.
- 라벨 "펼치기 ▼" / "접기 ▲" (숫자 없음), 조 칩 영역 우측 하단, 터치 타깃 44×44px.
- 펼침 상태 fridge-open-zones 저장·복원 (KEY fridge-chips:v4 그대로 — 초기화 없음).
- 조 헤더 (n/m): n = 파랑+빨강(state 1·2), m = 전체 칩 수. 파생 계산(비저장), 모든 조작 후 즉시 갱신.
- 칩: 솔리드, 활성화 스케일 1.05 + 그림자 + z-index 50, 드롭 150ms transition.
- touch-action: 기본 pan-y → 드래그 활성화 시에만 none (JS 인라인).
- 접힌 조 3행째 칩은 화면에 없으므로 드래그 불가 → 펼치고 옮기는 정책 (v1.5 확정 유지).
- 프롬프트: 접힘 무관 전량 나열 (67종), 2줄 (재료 · "소스, 오일, 조미료, 장류 모두 보유") + 종류 선택 시 3번째 줄.
- 복사·Google 버튼 유지. var 금지(const/let)·신규 라이브러리 금지 유지. vite base './' 유지.

================================================================
2. 수정 파일
================================================================
- src/App.jsx            : 센서 분리 (MouseSensor 5px + TouchSensor 1500/10), footer v1.5.1
- src/components/Chip.jsx: 그대로 (1.05 스케일 / pan-y 인라인 / listeners 본체만)
- src/components/ZoneList.jsx: 자격 판정 교체 (scrollHeight > 74+4), 버튼 표시 open 무관,
                              effect deps [compact, zoneChips.length]
- src/hooks/useFridge.js : 무변경 (v1.4 주석 v1.5 갱신분 유지)
- src/styles.css         : 헤더 주석 v1.5.1 (규칙 자체는 v1.5와 동일, 44×44 유지)
- index.html             : 무변경 (viewport meta 존재 확인)
- verify/v15-logic-test.mjs: 섹션2(센서 분리)·4-2(자격 판정) 갱신 → 34건

================================================================
3. 검증 (node verify/v15-logic-test.mjs + node verify/var-scan.mjs)
================================================================
34건 ALL PASS (탭 3연속 / 센서 분리·distance 5·delay 1500·KeyboardSensor 없음 /
1.05·150ms·z50·pan-y 규칙 / 74px·자격 판정·ResizeObserver·44×44·open-zones 왕복 /
(n/m) 8-10·0-10·10-10·11-11·삭제 후 10-10 / 프롬프트 2줄·전량 67종·종류 줄 /
복사·Google 미변경 / fridge-chips:v4) + var 스캔 12파일 PASS.
vite build 성공 → push → Actions → 라이브 200.
