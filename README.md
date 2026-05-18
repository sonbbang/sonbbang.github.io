# 맛집 룰렛 🍽️

위치 기반으로 주변 맛집을 추천하고, 룰렛으로 오늘의 맛집을 선택해주는 웹 앱입니다.

## 주요 기능

- **위치 기반 맛집 검색**: 현재 위치 또는 수동 좌표 입력으로 주변 식당 검색 (OpenStreetMap Overpass API 사용)
- **룰렛 뽑기**: 검색된 식당 중 하나를 랜덤으로 선택하는 애니메이션 룰렛 휠
- **소셜 로그인**: GitHub OAuth 또는 이메일/비밀번호로 로그인 (Netlify Identity)
- **리뷰 작성**: 별점(1~5)과 텍스트 리뷰 등록
- **좋아요**: 마음에 드는 식당에 좋아요 표시

## 기술 스택

| 구분 | 기술 |
|------|------|
| 프레임워크 | TanStack Start |
| UI | React 19, Tailwind CSS 4 |
| 인증 | Netlify Identity (`@netlify/identity`) |
| 데이터베이스 | Netlify Database (Postgres) + Drizzle ORM |
| 맛집 데이터 | OpenStreetMap Overpass API (무료, API 키 불필요) |
| 배포 | Netlify |

## 로컬 실행 방법

> ⚠️ Netlify Identity는 실제 Netlify 배포 환경에서만 동작합니다. 로컬에서는 맛집 검색과 UI만 테스트 가능합니다.

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000` 접속

## 환경 변수

배포 시 별도 환경 변수 설정이 필요하지 않습니다. Netlify Database와 Identity는 자동으로 연결됩니다.

## 프로젝트 구조

```
src/
├── routes/
│   ├── __root.tsx          # 루트 레이아웃 (IdentityProvider 포함)
│   ├── index.tsx           # 메인 페이지 (맛집 검색 + 룰렛)
│   ├── login.tsx           # 로그인/회원가입 페이지
│   └── restaurants/$id.tsx # 식당 상세 (리뷰, 좋아요)
├── components/
│   ├── RouletteWheel.tsx   # Canvas 기반 룰렛 휠
│   └── CallbackHandler.tsx # OAuth 콜백 처리
├── lib/
│   ├── auth.ts             # 서버 사이드 인증
│   └── identity-context.tsx # 클라이언트 인증 상태
├── middleware/
│   └── identity.ts         # 인증 미들웨어
└── server/
    └── restaurants.functions.ts # DB 서버 함수
db/
├── schema.ts               # Drizzle 스키마 (restaurants, reviews, likes)
└── index.ts                # DB 클라이언트
netlify/database/migrations/ # 자동 적용 마이그레이션
```
