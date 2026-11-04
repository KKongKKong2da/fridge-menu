# fridge-menu 리팩토링 설계서 (단계별 커밋 계획)

작성일: 2026-11-04 | 대상: C:\Users\PRINCESS-PC\Documents\fridge-menu (GitHub: KKongKKong2da/fridge-menu)
전제: **사용자 기능 변화 0.** 모든 단계의 끝은 `app/verify` 118케이스 ALL PASS + 빌드 성공으로 확정한다.

---

## 0단계. 사전 확인 (완료됨)

| 확인 | 결과 |
|---|---|
| 로컬 HEAD | `6a112bf` (v1.6.3 칩 이동 봉합 커밋) = GitHub의 v1.6.3과 동일 소스 |
| origin/main | `ba4f756` (README 갱신 2건이 로컬보다 앞) |
| 조치 | `git pull --ff-only` 완료 → 로컬 HEAD `ba4f756` (완전 최신, ahead 0) |
| 결론 | **칩 이동 코드는 로컬=GitHub 동일(v1.6.3).** README만 로컬에 최신 반영됨 |

안전망(롤백 기준점 태그):
```powershell
cd C:\Users\PRINCESS-PC\Documents\fridge-menu
git tag pre-refactor-ba4f756
git push origin pre-refactor-ba4f756
```
> 이후 어떤 단계도 문제가 생기면 `git revert <단계 커밋>` (개별 롤백),
> `git checkout pre-refactor-ba4f756 -- .` (전체 롤백)으로 복귀한다.

---

## 공통 게이트 (모든 단계 끝에 이것을 돌린다)

```powershell
cd C:\Users\PRINCESS-PC\Documents\fridge-menu\app
node verify\v16-logic-test.mjs   ; if ($LASTEXITCODE -ne 0) { "STOP"; break }   # 53건
node verify\v162-logic-test.mjs  ; if ($LASTEXITCODE -ne 0) { "STOP"; break }   # 27건
node verify\v163-logic-test.mjs  ; if ($LASTEXITCODE -ne 0) { "STOP"; break }   # 38건
node verify\var-scan.mjs         ; if ($LASTEXITCODE -ne 0) { "STOP"; break }
node verify\_kor-scan.mjs        ; if ($LASTEXITCODE -ne 0) { "STOP"; break }
npm run build
```
**합계 118케이스 ALL PASS + dist 생성 성공 → 그 단계 커밋.**
하나라도 실패하면 커밋하지 않고 원상복구한다.
push는 단계 끝마다 1회 권장 (push마다 Actions가 Pages를 배포 → 단계별 롤백이 쉬워짐).
---

## 1단계 — 검증 게이트 재정비 (src 접촉 0줄) → 예상 68→78점

**목적**: "FAIL이 나도 종료 코드가 0(성공)인" 함정 제거. 공식 게이트를 app/verify 5종으로 확정.

**작업**
1. 루트 `verify/`의 4개를 `verify-legacy/`로 이동 (git mv 사용):
   `v12-logic-test.mjs`, `v13-logic-test.mjs`, `v14-logic-test.mjs`, `var-scan.mjs`
2. 이동한 파일 상단에 1줄 주석 추가:
   `// 구버전(v1.2~v1.4) 스펙 기준. 현행 코드 기준 FAIL(v12:9건, v14:12건)은 정상 — 문서 기록용, 게이트 아님`
3. app/verify 5종 말미에 exit 규칙 명시 (실패 1건이어도 exit 1):
   ```js
   if (failCount > 0) { console.log('FAIL ' + failCount); process.exit(1) }
   console.log('ALL PASS (' + total + ')'); process.exit(0)
   ```
4. `poll-deploy.mjs` 사본 정리: `app/verify/poll-deploy.mjs`(38줄) 유지, 루트판(72줄) 삭제.
   `check-live.mjs`는 루트 유지. (두 사본은 해시가 다른 별개 파일이었음)

**검증**: 게이트 5종 ALL PASS — 스크립트 이동이라 118케이스 결과 변화가 없어야 함 (변화 = 이동 실수)
**커밋**: `refactor: 검증 게이트 app/verify 5종 확정(exit 규칙) + legacy 스크립트 격리`

---

## 2단계 — styles.css 정리 → 78→84점

**목적**: 버튼 스타일 4중 필사(7개 속성 완전 동일 2쌍) + 33줄 히스토리 주석 제거. 191줄 → 약 140줄.

**작업**
1. CSS 상단 히스토리 주석(약 37줄) → `CHANGES_styles_history.md` 신설하여 이관.
   CSS에는 6줄만 남김 (파일 목적, --gray 단일 규칙, 칩 솔리드 규칙).
2. 버튼 공통 클래스 도입 (DOM 구조 변경 없음, className만 추가):
   ```css
   .btn { border: 1.5px solid var(--accent); color: var(--accent); background: var(--card);
          border-radius: 8px; font-size: 13px; font-weight: 700; padding: 7px 14px; cursor: pointer; }
   .btn:active { transform: translateY(1px); }
   .btn--gray { border-color: var(--gray); color: var(--gray); }
   .btn--fill { background: var(--accent); border-color: var(--accent); color: #fff; }
   .btn--plus { padding: 6px 11px; font-size: 15px; line-height: 1; }
   ```
   - `.zone__add` · `.zone__fold-btn` → `className="btn btn--plus"` (▼▲는 + `btn--gray`)
   - `.batch-btn` → `btn` (+ `--gray` 계열 변형), `.result-card__copy` → `btn`
   - `.launch-btn` · `.migration__go` → `btn btn--fill`, `.migration__copy` → `btn`
   - 삭제 대상: 개별 셀렉터의 border/radius/padding/font/cursor/:active (총 7종 × 4곳)
3. 유지: `chip__x` hover 계열(--blue-deep/--red-deep/--gray), 480px 미디어쿼리, --gray 단일 변수.

**핵심 이득**: "＋ 버튼 = ▼▲ 버튼 크기" 요구가 CSS 주석 의존 → 클래스 공유로 물리 보장.
**검증**: 게이트 5종 ALL PASS + `npm run build` + `npm run preview`에서 버튼 5종(＋/▼▲/일괄 2개/복사/Google) 크기·색 육안 확인
**커밋**: `refactor: styles.css 버튼 .btn 공통화 + 히스토리 주석 문서 이관 (191→140줄)`
---

## 3단계 — src 주석 배포용 축약 (코드 문장 0건 변경) → 84→88점

**목적**: src 484줄 중 주석 157줄(32%) → 파일당 2~8줄("이 파일의 일 + 함정")로 축약.
증상-원인 서사(v1.5 접기 버튼 소멸, v1.6.1 스냅샷 경위, v1.6.3 봉합 서사…)는 git 커밋 로그가 이미 보관 중 → 코드에서 삭제.

| 파일 | 현 주석 | 목표 | 남길 내용 |
|---|---|---|---|
| App.jsx | 62줄 | 8줄 | items 스냅샷 소유 이유 / 착지 번역→저장→스냅샷 3단계 한 줄 / NUL 문자 금지 |
| lib/storage.js | 24줄 | 8줄 | v4 스키마, 전수 검증 실패 시 전체 초기화, 조 안 정렬만, 컨테이너 번역 의도 |
| lib/prompt.js | 12줄 | 5줄 | 빨강=필수·파랑=선택 2줄 분리 규칙, 회색 제외 |
| Chip.jsx | 22줄 | 6줄 | touch-action pan-y↔none 스위칭, 드래그 후 350ms 클릭 봉인 |
| ZoneList.jsx | 19줄 | 5줄 | 74px 실측(콘텐츠 높이) 판정, items는 App 스냅샷 + 안전복귀 |
| useFridge / useLongPressDrag / materials / ResultCard / MigrationNotice / KindPicker / main | 각 2~8줄 | 각 2~4줄 | 용도 1~2줄 |

**작업 원칙**
- 삭제는 **주석 줄만**. 코드 문장 추가·삭제 0건이어야 한다 (`git show --stat`으로 코드 라인 변화 0 확인).
- 파일 헤더 버전 태그(`// App.jsx — v1.6.3`)는 1줄 유지.
- 예상: 157줄 → 약 40줄 (src 484 → 367줄).

**검증**: 게이트 5종 ALL PASS (118케이스 결과가 2단계와 **동일**해야 함) + build 성공
**커밋**: `refactor: src 주석 배포용 최소 축약 (157→40줄, 코드 문장 무변경)`

---

## 4단계 — 중복 통합 (동작 동일) → 88→90점

**작업 3건**
1. **클립보드 통합**: `src/lib/clipboard.js` 신설 (~25줄)
   - ResultCard.jsx(67줄)·MigrationNotice.jsx(57줄)에 각각 15줄씩 복제된
     "navigator.clipboard → textarea+execCommand 폴백" 2장을 단일 함수로.
   - `export async function copyText(text) → boolean` (성공 시 true)
   - `copied` 표시(1600ms) 패턴은 각 컴포넌트 유지 (UI 상태라 합법),
     복사 함수와 `flashCopied`만 공용. 예상 -25줄.
2. **SUPPRESS_MS 단일화**: `useLongPressDrag.js`가 `export const SUPPRESS_MS = 350`
   → Chip.jsx가 import로 참조 (Chip.jsx의 자체 `const DRAG_CLICK_SUPPRESS_MS = 350` 삭제).
   두 파일이 같은 값을 각자 정의한 상태 → 단일 소스.
3. **미사용 export 정리 (안전 규칙 적용)**
   - 규칙: 삭제 전 `app/verify/*.mjs`의 import 목록과 grep 대조 → 하나라도 참조하면 **유지**.
   - 제거 후보(파일이 내부 전용으로 강등): `prompt.js`의 `BULLET`·`redNames`·`blueNames`(내부화),
     `storage.js`의 `screenOrder`·`normalizeZone`(내부화), `LEGACY_RECENT_KEY`(내부화).
   - `normalizeName`(storage 내부+검증 사용 확인 후 결정), `persistOpenZones`(useFridge 사용 → 유지).

**검증**: 게이트 5종 ALL PASS (v16·v163이 storage/prompt export를 import하므로 이 단계가 게이트를 깨면 안 됨)
+ build + `npm run preview` → [복사] 버튼, 마이그레이션 카드(레거시 키 있는 브라우저) 동작 확인
**커밋**: `refactor: lib/clipboard 통합 + SUPPRESS_MS 단일화 + 미사용 export 정리 (동작 무변경)`

---

## 5단계 — 저장소 잔여물 정리 → 90→92점

**작업**
1. `.gitignore` 보완 (현재 누락): `*.log`, `x/`
2. 삭제(로컬 파일): `_v12.log` `_v13.log` `_v14.log` `_v16.log` `_v162.log` `_v163.log` `_var.log` (7개, 미추적)
3. `app/src/components/RecentBar.jsx` 삭제 (import 0건 확인 완료 — v1.2 폐지 선언만 남은 4줄).
   git 히스토리 v1.1 커밋에 원본 보존 → 필요 시 복원 가능.
4. `x/` 폴더: gitignore로 제외 (로컬 자료는 보존). 이미 추적된 항목이 있으면 `git rm --cached`로 추적만 해제.
5. `app/package.json` version `1.3.0` → `1.6.3` (발표 버전 정합; README는 이미 v1.6.3)
6. `app/verify/_live-scan.mjs` (미추적·미사용) → `x/`로 이동 또는 삭제 판단 (내용 10줄, 게이트 미포함).

**검증**: 게이트 5종 ALL PASS + build 성공 (RecentBar import 0건 → 번들 무영향)
**커밋**: `chore: 로그·x/ gitignore 보완 + RecentBar.jsx 삭제 + package version 1.6.3`

---

## 6단계 — 푸시·배포·실사용 테스트

```powershell
cd C:\Users\PRINCESS-PC\Documents\fridge-menu
git log --oneline -7         # 0단계 태그 + 단계 커밋 5개 확인
git push origin main         # → Actions: build → Pages 자동 배포
node app\verify\poll-deploy.mjs   # (인자: HEAD 커밋 SHA 12자) Actions 완료 대기
node check-live.mjs               # 라이브 js/css 자산 존재·200 확인
```

**배포 후 브라우저 체크리스트 (PC + 모바일 실기)**
1. PC 드래그: 칩 앞→뒤 / 뒤→앞 왕복 3회 → 놓은 자리에 유지
2. 새로고침 → 새 순서 그대로
3. 여백·빈 조·조 간 드롭 → 되돌아가면 정상(무이동), 그 조 안이면 맨 뒤 착지
4. 이동 직후 색 자동 변화 없음, × 자동 발동 없음
5. [복사] → 클립보드 전문 3~5줄, [Google] → 검색어에 임박(빨강) 줄 포함
6. 640px 이하: ▼ 펼침/▲ 접힘, 새로고침 후에도 펼친 조 유지
7. 콘솔(F12)에 에러 0건

**롤백 매뉴얼**
```powershell
git revert <단계 sha>                      # 특정 단계만 되돌리기
git checkout pre-refactor-ba4f756 -- .    # 전체 롤백 (0단계 태그)
git push origin main --force-with-lease   # (최종 수단; 권장: revert를 정방향 푸시)
```
단계마다 푸시하면 Actions가 단계별로 배포하므로, 문제 발견 시 해당 단계만 revert → 재배포가 가장 안전하다.

---

## 총람

| 단계 | 대상 | 코드 규모 | 게이트 (필수 관문) | 커밋 유형 |
|---|---|---|---|---|
| 0 | 사전 확인 + 롤백 태그 | (완료) | pull 확인 | 태그 |
| 1 | verify 게이트 5종 확정 + legacy 격리 | src 0줄 | **118 ALL PASS** | refactor |
| 2 | styles.css .btn 공통화 + 주석 이관 | CSS -50줄 | 118 + build + preview | refactor |
| 3 | src 주석 157→40줄 | 코드 문장 0건 | 118 결과 동일 | refactor |
| 4 | clipboard 통합·SUPPRESS_MS·export | -40줄 | 118 + preview | refactor |
| 5 | 로그·x/·RecentBar·version | -10종 | 118 + build | chore |
| 6 | push·배포·테스트 | — | poll-deploy + check-live | — |

**예상 최종**: src 484줄 → 367줄 (-24%), CSS 191 → 140줄 (-27%), 점수 68 → 92점, 사용자 체감 기능 변화 0.

**하지 않기로 확정한 것**: App.jsx 쪼개기(prop drilling 이득 적음), TypeScript 전환(증명 비용 과다), 마이그레이션 코드 삭제(레거시 사용자 백업 경로 유지).