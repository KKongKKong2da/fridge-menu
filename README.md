# 냉장고 재료 · 메뉴 추천 (fridge-menu)

가지고 있는 냉장고 재료 칩을 골라 **레시피 검색 프롬프트 한 줄**을 만들어주는 초경량 웹앱.
검정(보유) → 파랑(쓸 재료) → 빨강(임박+꼭 쓸) 3색 칩, 드래그 정렬, 프롬프트 복사/4발판(Google·네이버·Gemini·Claude).

- 스택: Vite + React (JavaScript), @dnd-kit, localStorage 1키(`fridge-chips`)
- 명세서: `SPEC.md` (v1.1)
- 검증: `verify/*.mjs` (node로 저장/프롬프트 로직 시뮬 — `node verify\m3-logic-test.mjs` 등)

## 실행

```bash
cd app
npm install
npm run dev      # 개발 서버
npm run build    # dist 생성
```

## 배포 (GitHub Pages)

`.github/workflows/deploy.yml`이 main push 시 `app/`을 빌드해 Pages로 배포합니다.
`vite.config.js`의 `base: './'`로 하위 경로(`/fridge-menu/`)에서도 자산이 정상 로드됩니다.
