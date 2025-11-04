# 보험 관리 시스템 (Insurance Management System)

## 프로젝트 개요

한국어 기반 보험 사고 관리 시스템으로, 접수부터 종결까지의 진행 흐름을 한눈에 관리할 수 있는 웹 애플리케이션입니다.

## 주요 기능

### 인증 시스템
- 사용자명 기반 로그인 (관리자가 계정 생성)
- 비밀번호 암호화 (bcrypt)
- 세션 기반 인증 (express-session + memorystore)
- 역할 기반 접근 제어 (관리자/사원)
- 자동 로그인 기능 (localStorage)
- 보호된 라우트

### 관리자 설정
- 사용자 계정 테이블 (검색 및 필터링)
- 이름 기반 검색
- 역할 필터 (전체/관리자/사원)
- 계정 상세보기 모달 (우측 슬라이드 패널)
- 비밀번호 초기화 기능 (관리자 전용)
  - 747px × 516px 중앙 모달
  - 선택된 사용자 프로필 카드
  - 자동 비밀번호 설정 (0000)
  - 초기화 및 확인 버튼
- 계정 삭제 기능 (관리자 전용, Soft Delete)
  - 747px × 386px 중앙 모달
  - 사용자 정보 카드 표시
  - 경고 메시지: "계정 삭제 시 즉시 로그아웃됩니다. 활동 로그/정산 기록 등 이력 데이터는 보존됩니다."
  - 취소/영구 삭제 버튼
  - Soft delete: status 필드만 "deleted"로 변경

### 대시보드
- 종합 대시보드 (로그인 후 메인 화면)
- Pretendard 폰트, 크림/오렌지 및 퍼플/블루 그라데이션 배경
- FLOXN 브랜딩

### UI/UX 특징
- 한국어 우선 인터페이스 (Pretendard 폰트)
- 크림/오렌지 및 퍼플/블루 그라데이션 배경
- FLOXN 브랜딩
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
      dashboard.tsx      # 대시보드
      admin-settings.tsx # 관리자 설정 (계정 관리, 비밀번호 초기화)
    components/
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

### POST /api/update-password
비밀번호 초기화 (관리자 전용)
- Auth: 세션 필수 + 관리자 권한 필수
- Body: `{ username: string, newPassword: string }`
- Response: `{ success: true, user: User }`
- Error: 
  - 401 (인증되지 않음)
  - 403 (관리자 권한 없음)
  - 404 (사용자 없음)
  - 400 (검증 오류)

### POST /api/delete-account
계정 삭제 (관리자 전용, Soft Delete)
- Auth: 세션 필수 + 관리자 권한 필수
- Body: `{ username: string }`
- Response: `{ success: true, user: User }`
- 동작: 사용자 데이터는 보존하고 status만 "deleted"로 변경
- Error:
  - 401 (인증되지 않음)
  - 403 (관리자 권한 없음)
  - 404 (사용자 없음)
  - 400 (검증 오류)

## 데이터 모델

### User
```typescript
{
  id: string;                  // UUID
  username: string;            // 사용자명 (고유)
  password: string;            // bcrypt 해시
  role: string;                // "관리자" | "사원"
  name: string;                // 이름
  company: string;             // 소속 회사
  department?: string;         // 부서
  position?: string;           // 직급
  email?: string;              // 이메일
  phone?: string;              // 휴대폰
  office?: string;             // 사무실 전화
  address?: string;            // 주소
  status: string;              // "active" | "deleted" (Soft delete용)
}
```

## 테스트 계정

개발 환경에서 자동으로 생성되는 테스트 계정:
- **사용자명**: `xblock01`
- **비밀번호**: `1234` (초기) / `0000` (초기화 후)
- **역할**: 관리자
- **이름**: 김블락
- **회사**: 플록슨

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
   - userId 및 userRole 저장
3. **역할 기반 접근 제어**:
   - 관리자 전용 API 엔드포인트 (/api/update-password, /api/delete-account)
   - 세션에 role 정보 저장
   - API 요청 시 권한 검증
   - Soft delete로 데이터 보존
4. **입력 검증**: Zod 스키마로 모든 API 요청 검증
5. **CSRF 보호**: sameSite 쿠키로 기본 보호
6. **세션 타임아웃**: 24시간

## 최근 업데이트 (2024.11.04)

### 완료된 기능
- ✅ 관리자 설정 페이지 구현
- ✅ 사용자 계정 테이블 (검색 및 필터링)
- ✅ 계정 상세보기 모달 (우측 슬라이드 패널)
- ✅ 비밀번호 초기화 기능 (관리자 전용)
- ✅ 계정 삭제 기능 (관리자 전용, Soft Delete)
- ✅ 역할 기반 접근 제어 (RBAC)
- ✅ User 스키마 확장 (role, name, company, status 등)
- ✅ API 보안 강화 (인증 + 권한 검사)

### 보안 개선사항
- 세션에 userRole 추가
- POST /api/update-password에 관리자 권한 검사 추가
- POST /api/delete-account에 관리자 권한 검사 추가
- Soft delete 구현으로 데이터 보존
- Zod 스키마로 API 요청 검증 강화
- 인증되지 않은 요청 차단 (401)
- 권한 없는 요청 차단 (403)

## 향후 개발 계획

1. **사용자 관리**:
   - 신규 사용자 생성 기능 (관리자 전용)
   - 사용자 정보 수정 기능
   - 정적 사용자 목록을 실제 백엔드 데이터로 교체
   - 삭제된 계정 복원 기능
2. **사고 관리**: CRUD 기능
   - 사고 등록
   - 사고 조회/검색
   - 사고 상태 업데이트
   - 사고 완료/종결
3. **대시보드 확장**:
   - 실시간 통계
   - 차트 및 그래프
   - 필터링 및 정렬
4. **알림 시스템**: 이메일/SMS 알림
5. **파일 첨부**: 사고 관련 문서 업로드
6. **감사 로그**: 비밀번호 변경 등 중요 작업 로깅

## 디자인 가이드라인

`design_guidelines.md` 파일 참조 - 모든 UI 구현은 이 가이드라인을 따라야 합니다.

주요 원칙:
- 한국어 우선
- 블러 효과를 활용한 깊이감
- 일관된 간격 (Tailwind 2, 4, 6, 8 단위)
- Noto Sans KR 폰트
- 접근성 준수
- 반응형 디자인
