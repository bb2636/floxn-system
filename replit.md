# 보험 관리 시스템 (Insurance Management System)

## 프로젝트 개요

한국어 기반 보험 사고 관리 시스템으로, 접수부터 종결까지의 진행 흐름을 한눈에 관리할 수 있는 웹 애플리케이션입니다.

## 주요 기능

### 인증 시스템
- 보험사 사고번호 기반 로그인
- 비밀번호 암호화 (bcrypt)
- 세션 기반 인증 (express-session + memorystore)
- 자동 로그인 기능 (localStorage)
- 보호된 라우트

### UI/UX 특징
- 한국어 우선 인터페이스 (Noto Sans KR 폰트)
- 이중 패널 레이아웃 (좌측 장식 패널 + 우측 로그인 폼)
- 대기권 블러 효과로 깊이감 표현
- 반응형 디자인 (모바일/태블릿/데스크톱)
- 다크 모드 지원
- 아름다운 로딩/에러 상태

## 기술 스택

### Frontend
- React with TypeScript
- Wouter (라우팅)
- TanStack Query (데이터 페칭)
- React Hook Form + Zod (폼 검증)
- Shadcn UI + Tailwind CSS (컴포넌트 및 스타일링)
- Lucide React (아이콘)

### Backend
- Express.js
- bcrypt (비밀번호 해싱)
- express-session (세션 관리)
- memorystore (인메모리 세션 저장소)
- Zod (API 검증)

### 데이터베이스
- 인메모리 저장소 (MemStorage)
- 프로덕션에서는 PostgreSQL로 교체 가능

## 프로젝트 구조

```
client/
  src/
    pages/
      login.tsx          # 로그인 페이지
      dashboard.tsx      # 대시보드 (로그인 후)
    components/
      test-credentials-banner.tsx  # 테스트 계정 안내
      ui/                # Shadcn UI 컴포넌트
    lib/
      queryClient.ts     # TanStack Query 설정

server/
  index.ts              # Express 서버 + 세션 설정
  routes.ts             # API 라우트
  storage.ts            # 인메모리 저장소 인터페이스

shared/
  schema.ts             # 공유 데이터 스키마 (Drizzle + Zod)
```

## API 엔드포인트

### POST /api/login
사용자 로그인
- Body: `{ accidentNumber: string, password: string, rememberMe: boolean }`
- Response: `User` (비밀번호 제외)
- Error: 401 (인증 실패), 400 (검증 오류)

### POST /api/logout
로그아웃 및 세션 삭제
- Response: `{ success: true }`

### GET /api/user
현재 로그인된 사용자 정보
- Response: `User` (비밀번호 제외)
- Error: 401 (미인증)

### GET /api/check-session
세션 유효성 확인
- Response: `{ authenticated: boolean, user?: User }`

## 데이터 모델

### User
```typescript
{
  id: string;                  // UUID
  accidentNumber: string;      // 보험사 사고번호 (고유)
  password: string;            // bcrypt 해시
}
```

## 테스트 계정

개발 환경에서 자동으로 생성되는 테스트 계정:
- **사고번호**: `TEST-2024-001`
- **비밀번호**: `test1234`

## 환경 변수

### SESSION_SECRET
세션 암호화를 위한 비밀 키
- 기본값: `insurance-system-secret-key-change-in-production`
- 프로덕션에서는 반드시 변경 필요

## 실행 방법

```bash
npm run dev
```

서버는 포트 5000에서 실행되며, Vite 개발 서버와 Express API가 통합되어 동작합니다.

## 보안 고려사항

1. **비밀번호 해싱**: bcrypt (SALT_ROUNDS=10)
2. **세션 보안**: 
   - httpOnly 쿠키
   - secure (프로덕션)
   - sameSite: 'lax'
3. **CSRF 보호**: sameSite 쿠키로 기본 보호
4. **세션 타임아웃**: 24시간

## 향후 개발 계획

1. **사용자 등록**: 신규 사용자 가입 기능
2. **비밀번호 재설정**: 이메일 기반 비밀번호 복구
3. **사고 관리**: CRUD 기능
   - 사고 등록
   - 사고 조회/검색
   - 사고 상태 업데이트
   - 사고 완료/종결
4. **대시보드 확장**:
   - 실시간 통계
   - 차트 및 그래프
   - 필터링 및 정렬
5. **권한 관리**: 역할 기반 접근 제어 (RBAC)
6. **알림 시스템**: 이메일/SMS 알림
7. **파일 첨부**: 사고 관련 문서 업로드

## 디자인 가이드라인

`design_guidelines.md` 파일 참조 - 모든 UI 구현은 이 가이드라인을 따라야 합니다.

주요 원칙:
- 한국어 우선
- 블러 효과를 활용한 깊이감
- 일관된 간격 (Tailwind 2, 4, 6, 8 단위)
- Noto Sans KR 폰트
- 접근성 준수
- 반응형 디자인
