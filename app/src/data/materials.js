// ============================================================
// data/materials.js
// 명세서 3절 = 디폴트 재료 38종 (11 + 18 + 9)
// 세그먼트('|')는 최초 배치 순서를 그대로 보존하기 위한 단위.
// FLAT_MATERIALS = 조 1 → 2 → 3 순서로 이어붙인 38종 (첫 실행 생성 순서)
// ============================================================

export const ZONE_LABELS = {
  1: '정육·달걀',
  2: '과일·채소',
  3: '통조림·소스',
}

export const ZONE_ORDER = [1, 2, 3]

export const ZONE_SEGMENTS = {
  1: [
    ['우삼겹', '갈비살', '스테이크', '불고기'],
    ['삼겹살', '대패삼겹살'],
    ['닭다리살'],
    ['훈제오리'],
    ['달걀'],
    ['베이컨', '소시지'],
  ],
  2: [
    ['마늘', '대파', '양파', '고추'],
    ['상추', '깻잎', '청경채', '배추', '양배추', '양상추'],
    ['팽이버섯', '새송이버섯', '양송이버섯'],
    ['두부', '애호박', '감자'],
    ['포도', '배'],
  ],
  3: [
    ['참치', '스팸'],
    ['카레', '하이라이스'],
    ['돈까스소스', '칠리소스', '참깨소스', '굴소스', '소갈비소스'],
  ],
}

// 조 이름 순서를 지킬 수 있도록 정렬 키를 붙임 (Object.keys 순서에 의존하지 않음)
export const DEFAULT_MATERIALS = ZONE_ORDER.flatMap((zone) =>
  ZONE_SEGMENTS[zone]
    .map((segment, segmentIndex) => segment.map((name) => ({ name, zone, segmentIndex })))
    .flat()
)

export const DEFAULT_COUNT = DEFAULT_MATERIALS.length // 38
