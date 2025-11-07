# 누수 사고 관리 시스템 (Water Damage Management System - FLOXN)

## Overview

본 시스템은 **누수 사고의 접수부터 현장조사, 견적, 정산, 통계, 기준정보 관리까지 전 과정을 디지털화한 통합 관리 플랫폼**입니다.

This comprehensive Insurance Accident Management System digitalizes and automates the entire workflow for water damage insurance claims, from reception to field investigation, estimation, settlement, statistics, and master data management. It serves insurance companies, platform administrators (FLOXN), repair companies, clients, assessors, and investigators. The platform focuses on automating document generation, transmission, and approvals, featuring robust role-based authentication, an administrator panel for user management, and an intuitive dashboard, all built with a clean, responsive UI/UX and clear FLOXN branding.

**Key Stakeholders:**
- 보험사 (Insurance Companies)
- 플랫폼 관리자/플록슨 (Platform Administrators - FLOXN)
- 수리업체/협력사 (Repair Companies/Partners)
- 의뢰사 (Clients)
- 심사사 (Assessors)
- 조사사 (Investigators)

## User Preferences

- I prefer simple language.
- I want iterative development.
- Ask before making major changes.
- I prefer detailed explanations.
- Do not make changes to the `design_guidelines.md` file.
- **CRITICAL**: Features may be added but NEVER removed - maintain all functionality from documentation

## Complete Project Specification

### 1. 홈(Home)
- **Users**: 모든 사용자 (플랫폼 담당자, 협력업체, 보험사)
- **Purpose**: 전체 진행 현황 및 주요 지표 확인, 빠른 메뉴 이동
- **Display**: 접수건수, 진행률, 미정산 내역, 알림, 문의사항
- **Actions**: 주요 모듈 바로가기, 1:1 문의 작성, 실시간 알림 확인
- **Permissions**:
  - 관리자: 모든 데이터 열람
  - 협력사(수리업체): 자기 회사 데이터만 열람
    - 팀장: 자기 회사의 모든 건 열람
    - 직원: 자기가 맡은 건만 열람
  - 보험사: 자기 보험사 데이터만 열람
    - 팀장: 자기 보험사의 모든 건 열람
    - 직원: 자기가 맡은 건만 열람
  - 협력사/보험사 공통: 미결건, 미정산 건만 홈에 표시
- **Technical**: 반응형 디자인으로 모바일에서도 사용 가능

### 2. 접수 관리 (Reception Management)
- **Users**: 플랫폼 담당자
- **Purpose**: 보험사로부터 접수된 누수 사고 신규 등록 및 관리
- **Input Fields**:
  - 접수번호(자동), 접수일자, 보험사명, 담당자, 연락처
  - 사고 원인, 피해유형, 추정손해액, VIP 여부
  - 피해 위치(주소 검색), 피해 품목/수량
- **Actions**:
  - 신규등록 / 저장 / 초기화
  - 협력업체 배정(출동가능권역 필터 기반)
  - 배당 협력사 변경 팝업
  - 협력업체 배당 시 "출동 가능 권역"에 해당하는 업체 리스트 자동 표시
  - 권역별 대체 협력업체 선택 팝업 제공

### 3. 현장 조사 (Field Survey)
- **Users**: 수리업체 사용자
- **Purpose**: 현장 방문 결과 및 조사 내용 입력
- **Input Fields**: 사고 원인, 이동거리, 특이사항, VOC, 복구 방식(부분/전체), 손해액, 견적정보
- **Actions**: 저장 / 수정 기능

### 4. 도면 작성 (Restoration Estimation - Drawing)
- **Users**: 수리업체 / 관리자
- **Purpose**: 피해 범위 도면 기반 기록 및 복구 범위 산정
- **Input**: 공간별 피해 위치, 오염 지역, 원인 지점
- **Actions**:
  - 디지털 드로잉(원인, 피해, 오염 구역 표시)
  - 저장 시 견적서·보고서 자동 연동

### 5. 이미지 및 파일 관리 (Image & File Management)
- **Users**: 수리업체 / 관리자
- **Purpose**: 단계별 이미지 및 파일 업로드·관리
- **Input**: 초기/중간/완성 이미지, 청구 증빙서류, 동영상
- **Actions**: 업로드 / 다운로드 / 미리보기 / 일괄관리
- **Permissions**: 관련 케이스별로 접근권한 제한 적용

### 6. 견적서 관리 (Estimate Management)
- **Users**: 수리업체
- **Purpose**: 복구비용 견적 작성 및 제출
- **Input Fields**: 공종, 자재, 규격, 단가, 수량, VAT, 합계
- **Actions**:
  - 자동 합계 계산
  - PDF / Excel 다운로드
  - 제출 후 심사자 검토
- **Special Features**:
  - 현장 피해면적표 자동 생성
  - 소계, 일반관리비(6%), 이윤(15%), VAT 자동 계산

### 7. 현장출동보고서 (Field Reports)
- **Data Integration**: 현장조사, 도면작성, 이미지첨부, 견적서에서 작성한 항목이 보고서에 데이터 자동 연동
- **Users**: 관리자 (열람 및 승인 기능) / 보험사(보고서 열람)
- **Purpose**: 종합 보고서 생성 및 보험사 제출
- **Display**: 접수·조사·피해·견적 요약, 중복보험 정보
- **Actions**:
  - PDF 다운로드, 이메일 발송
  - 중복보험 관리(추가/삭제/안분조회)
- **Attachments (REQM-0706)**:
  - 수리중/완료 사진
  - 복구완료확인서, 도급계약서, 개인정보동의서
  - 1차 현장보고서 누락 서류 자동 포함
  - 금액 및 수수료는 접수/승인 내역에서 자동 불러오기

### 8. 진행 관리 (Progress Management - 종합진행현황)
- **Users**: 관리자 / 수리업체 / 보험사
- **Purpose**: 케이스별 진행 단계 추적 및 승인/반려 관리
- **Permissions**: 관리자는 모든 진행상황 열람, 이외 사용자는 자기 건만 열람
- **Display**: 진행상태(접수 → 심사대기 → 승인/반려 등), 담당자, 사고번호, 주요 진행사항
- **Actions**:
  - 상태 변경, 심사 승인/반려, 진행이력 기록
  - 알림 발송 (문자 메시지 포함)
  - INVOICE 발행 및 이메일 발송 (REQM-0706)
  - 자동 첨부파일 포함

### 9. 통계 및 정산 (Finance & Settlement)
- **Users**: 관리자 / 경영진 (플록슨 내부 관리자 전부)
- **Purpose**: 통계 조회, 정산/미수금 관리, 입금현황 매칭
- **Display**: 건별 통계, 회계현황, 예상손해액, 미수금 리스트
- **Actions**:
  - Excel 다운로드, 필터 조회
  - 입금내역 업로드 후 팝업에서 수동 매칭(REQM-0803)
  - 매칭 시 "미정산 → 정산" 상태 자동 변경

### 10. 관리자 메뉴 (Admin / Master Menu)
- **Users**: 플랫폼 관리자
- **Purpose**: 기준정보, 사용자, 권한, 코드 관리 및 문자 발송 관리
- **Features**:
  - 사용자/역할/권한 관리
  - 코드(피해유형, 사고원인 등) 관리
  - 협력업체 등록 및 서류(사업자등록증, 신분증, 통장사본) 관리
  - 공종DB 관리(노무비/자재비 DB)

## System Architecture

The system is a full-stack web application utilizing a React-based frontend and an Express.js backend.

### UI/UX Decisions
- **Language**: Korean-first interface using Pretendard and Noto Sans KR fonts.
- **Branding**: FLOXN branding with a distinctive cream/orange and purple/blue gradient background.
- **Responsiveness**: Designed for optimal viewing across mobile, tablet, and desktop devices.
- **Theming**: Supports dark mode.
- **Feedback**: Implements beautiful loading and error states for improved user experience.
- **Design Guidelines**: Adherence to a strict design guide emphasizing consistent spacing (Tailwind 2, 4, 6, 8 units), blur effects for depth, and Noto Sans KR font, prioritizing accessibility.

### Technical Implementations
- **Authentication**: Username-based login, bcrypt for password hashing, express-session with memorystore for session management, and robust role-based access control (Assessor, Investigator, Insurer, Partner, Administrator) with protected routes.
- **User Management (Admin)**: Includes a user account table with search and role-based filtering, a detailed right-sliding modal for account viewing and editing, and a two-step account creation flow with form validation, password generation, and cancellation confirmations. It supports password resets and soft deletion of user accounts.
- **Dashboard**: Provides a comprehensive overview as the main landing page post-login.
- **API Security**: Features session-based authentication, role-based authorization, Zod for request validation, CSRF protection, and session timeouts.
- **Case Intake System**: Features a multi-section collapsible form for creating new insurance claim cases, including automatic case number generation (CLM-{timestamp}), and extensive fields for basic, insurance, client, assessor, investigator, insured, and victim information. Validation is handled using `insertCaseRequestSchema` and foreign key fields are optional. Submission modes include "Save" (status "작성중") and "Submit" (status "제출"), with toast notifications and redirects.
- **Date Handling**: All date creations are in Korean Standard Time (KST).

### System Design Choices
- **Frontend**: React with TypeScript, Wouter for routing, TanStack Query for data fetching, React Hook Form with Zod for form validation, Shadcn UI and Tailwind CSS for component styling, and Lucide React for icons.
- **Backend**: Express.js, bcrypt, express-session, memorystore, and Zod for API validation.
- **Database**: PostgreSQL (Neon-backed) with Drizzle ORM for persistent data storage and automatic schema management. Key tables include `users` and `cases`.

## Implementation Status

### ✅ Currently Implemented Features
1. **Authentication & Authorization**
   - Username-based login system
   - Role-based access control (5 roles: 심사사, 조사사, 보험사, 협력사, 관리자)
   - Session management with express-session
   - Protected routes

2. **User Management (Admin Panel)**
   - User account table with search and filtering
   - Account creation with automatic password generation
   - Account editing modal (right-sliding panel)
   - Password reset functionality
   - Soft delete for user accounts

3. **Dashboard**
   - Basic landing page post-login
   - Role-based data visibility

4. **Case Intake System (접수 관리 - In Progress)**
   - Multi-section collapsible form (3 main sections)
   - Automatic case number generation (CLM-{timestamp})
   - Form validation with Zod
   - Save/Submit functionality
   - Figma design implementation with proper styling
   - Section 1: 기본 정보 (Basic Information)
   - Section 2: 피보험자 및 피해자 정보 (Insured & Victim Information)
   - Section 3: 사고 및 피해사항 (Accident & Damage Information) - ✅ NEW
     - 사고 원인 · 규모: 체크박스(손방, 피해사건조주), 4개 드롭다운, 사고내용 textarea
     - 피해사항(선택): 피해 품목/유형/수량/내용 입력 및 등록 기능
     - 배당사항(협력사 배당): 협력사/담당자/연락처 입력, 점검 기능
     - 일정 · 우선순위: 지도 선택, 특이사항 및 요청사항 textarea

### 🚧 Pending Implementation
1. **Home Dashboard Enhancements**
   - 접수건수, 진행률, 미정산 내역 통계
   - 알림 시스템
   - 1:1 문의 기능
   - Role-based data filtering (팀장 vs 직원)
   - Mobile responsive design

2. **접수 관리 Enhancements**
   - 협력업체 배정 기능 (출동가능권역 필터)
   - 배당 협력사 변경 팝업
   - 주소 검색 기능
   - 초기화 기능

3. **현장 조사 (Field Survey)**
   - Complete module implementation

4. **도면 작성 (Drawing)**
   - Digital drawing interface
   - Auto-linking to estimates and reports

5. **이미지 및 파일 관리**
   - File upload/download system
   - Preview functionality
   - Access control per case

6. **견적서 관리 (Estimate)**
   - Estimate creation form
   - Auto-calculation features
   - PDF/Excel export

7. **현장출동보고서 (Reports)**
   - Data integration from multiple sources
   - PDF generation
   - Email distribution
   - Duplicate insurance management

8. **진행 관리 (Progress)**
   - Progress tracking
   - Approval/rejection workflow
   - SMS notification system
   - INVOICE generation

9. **통계 및 정산 (Finance & Settlement)**
   - Statistics dashboard
   - Settlement management
   - Payment matching system
   - Excel export

10. **관리자 메뉴 Enhancements**
    - Code management (피해유형, 사고원인)
    - 협력업체 문서 관리
    - 공종DB 관리

## External Dependencies

- **Frontend Libraries**: React, TypeScript, Wouter, TanStack Query, React Hook Form, Zod, Shadcn UI, Tailwind CSS, Lucide React.
- **Backend Libraries**: Express.js, bcrypt, express-session, memorystore, Zod.
- **Database**: PostgreSQL (Neon-backed) with Drizzle ORM.
- **Development Tools**: Vite.
