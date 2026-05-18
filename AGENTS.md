# AGENTS.md

## 프로젝트 개요

위치 기반 맛집 추천 + 룰렛 선택 웹 앱. TanStack Start + Netlify Identity + Netlify Database(Postgres)로 구성.

## 디렉토리 구조

```
src/
├── routes/
│   ├── __root.tsx             # 루트 레이아웃: IdentityProvider + CallbackHandler 래핑
│   ├── index.tsx              # 메인 페이지: 위치 검색, 식당 목록, 룰렛
│   ├── login.tsx              # 로그인/회원가입: GitHub OAuth + 이메일
│   ├── faq.tsx                # 기존 템플릿 FAQ (미사용, 유지)
│   └── restaurants/
│       └── $id.tsx            # 식당 상세: 리뷰 목록/작성, 좋아요 토글
├── components/
│   ├── RouletteWheel.tsx      # Canvas 기반 룰렛 휠 컴포넌트
│   └── CallbackHandler.tsx    # OAuth 리다이렉트 토큰 처리
├── lib/
│   ├── auth.ts                # getServerUser 서버 함수 (SSR 인증)
│   └── identity-context.tsx   # React Context로 클라이언트 인증 상태 관리
├── middleware/
│   └── identity.ts            # identityMiddleware, requireAuthMiddleware
└── server/
    └── restaurants.functions.ts  # CRUD 서버 함수 (upsertRestaurant, addReview, toggleLike 등)
db/
├── schema.ts     # Drizzle 스키마: restaurants, reviews, likes 테이블
└── index.ts      # drizzle({ schema }) 클라이언트
drizzle.config.ts # out: "netlify/database/migrations" 필수
netlify/database/migrations/  # 자동 적용되는 SQL 마이그레이션
```

## 핵심 아키텍처 결정

### 식당 데이터 흐름
- 클라이언트에서 Overpass API(OpenStreetMap) 직접 호출 → 로컬 상태 저장
- 리뷰/좋아요 등 사용자 인터랙션 시에만 `upsertRestaurant`로 DB에 저장
- 식당 ID는 `osm-{osmNodeId}` 형식으로 충돌 방지

### 인증
- Netlify Identity (`@netlify/identity`) 패키지 사용
- **로컬호스트에서 인증 불가** — 실제 Netlify 배포 환경에서만 동작
- `IdentityProvider`는 SSR 시 `ready: false, user: null`로 렌더링하여 하이드레이션 불일치 방지

### 데이터베이스
- Drizzle ORM `@beta` dist-tag 필수 (`drizzle-orm@beta`, `drizzle-kit@beta`)
- 스키마 변경 시 반드시 `npx drizzle-kit generate` 실행
- 마이그레이션은 `netlify/database/migrations/`에 위치해야 자동 적용됨

### 서버 함수
- `createServerFn`에서 입력 검증 시 `.inputValidator()`만 사용 (`.validator()` 존재하지 않음)
- 인증 필요 함수: `.middleware([requireAuthMiddleware])` 적용 후 `context.user` 접근

## 코딩 컨벤션

- 컴포넌트: PascalCase
- 서버 함수 파일: `*.functions.ts`
- 스타일: Tailwind CSS 유틸리티 클래스
- 타입: `import type` 사용, strict 모드
- `noUnusedLocals`, `noUnusedParameters` 활성화 — 미사용 임포트 주의
