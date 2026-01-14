# 누수 사고 관리 시스템 (Water Damage Management System - FLOXN)

## Overview
본 시스템은 **누수 사고의 접수부터 현장조사, 견적, 정산, 통계, 기준정보 관리까지 전 과정을 디지털화한 통합 관리 플랫폼**입니다.
This comprehensive Insurance Accident Management System digitalizes and automates the entire workflow for water damage insurance claims. It serves insurance companies, platform administrators (FLOXN), repair companies, clients, assessors, and investigators. The platform focuses on automating document generation, transmission, and approvals, featuring robust role-based authentication, an administrator panel for user management, and an intuitive dashboard, all built with a clean, responsive UI/UX and clear FLOXN branding.

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
- **CRITICAL x3**: 헤더 디자인과 네비게이션 기능은 절대 변경 금지 (Top header design and navigation ABSOLUTELY NEVER change)

## System Architecture
The system is a full-stack web application utilizing a React-based frontend and an Express.js backend.

### UI/UX Decisions
- **Language**: Korean-first interface using Pretendard and Noto Sans KR fonts.
- **Branding**: FLOXN branding with a distinctive cream/orange and purple/blue gradient background.
- **Responsiveness**: Designed for optimal viewing across mobile, tablet, and desktop devices with specific header and dashboard layouts for different screen sizes.
- **Theming**: Supports dark mode.
- **Feedback**: Implements beautiful loading and error states.
- **Design Guidelines**: Adherence to a strict design guide emphasizing consistent spacing, blur effects, and Noto Sans KR font, prioritizing accessibility.

### Technical Implementations
- **Authentication**: Username-based login, bcrypt for password hashing, express-session with memorystore for session management, and robust role-based access control (Assessor, Investigator, Insurer, Partner, Client, Administrator) with protected routes.
- **User Management (Admin)**: Features a user account table with search and role-based filtering, a detailed right-sliding modal for viewing/editing, and a two-step account creation flow with validation, password generation, and soft deletion.
- **Case Intake System**: Multi-section collapsible form for new insurance claim cases, including automatic case number generation (CLM-{timestamp}), and extensive fields for various information categories.
- **Date Handling**: All date creations are in Korean Standard Time (KST).

### Feature Specifications
- **Home**: Overview of progress, key metrics, and quick navigation for all users.
- **Reception Management**: New water damage case registration and management, including assigning repair companies.
  - **Read-Only Mode**: Case details open in read-only mode by default; a "수정" button enables editing. Edit mode resets when closing the dialog or switching cases. All form fields, Select dropdowns, input fields, buttons, checkboxes, textareas, and clickable elements respect the readOnly prop.
- **Field Survey Workflow**: A sequential process for managing field investigations for a selected case.
  - **Field Survey Management**: Input and manage field investigation data.
  - **Drawing Creation**: Digital drawing workspace for damage scope with tools for images, rectangles, and leak markers, supporting high-resolution PNG export. Each case manages its own drawing individually (no auto-sync between related cases).
  - **Documents Upload**: Document and photo upload system with persistent storage, categorization, download, and delete functionalities. Each case manages its own documents individually (no auto-sync between related cases).
  - **Estimate Management**: Create and submit restoration cost estimates with dynamic calculation tables linked to master data, version tracking, and PDF/Excel export.
    - **Recovery Area Table (복구면적 산출표)**: Grouped layout by location (장소) with rowspan, +/- buttons for adding/removing rows within each location group, columns: 장소, +/-, 위치, 공종, 공사명, 피해면적(가로/세로/면적), 복구면적(가로/세로/면적), 비고.
    - **Labor Rate Tiers (노임단가 적용비율)**: Configurable 8-tier rate structure based on C/D ratio stored in database. Accessible via "적용비율 설정" button in labor cost section. Tiers determine rate multipliers (e.g., 85%+ = 100%, 50%+ = 115%, etc.) with edit/reset functionality.
  - **Field Reports**: Generate comprehensive reports integrating all collected field survey data.
- **Master Data Management**: Administrator-only feature for managing dropdown options (e.g., room categories, locations, work names) used throughout the system, with API endpoints for management and real-time updates.
- **Progress Management**: Track case progress, manage approvals/rejections, and send notifications.
- **Finance & Settlement**: View statistics, manage settlements, track receivables, and match payments.
  - **Invoice System**: Two distinct invoice types based on case recovery type:
    - **재사용 인보이스 (Reusable Invoice)**: For 직접복구 (direct restoration) cases - displays 손해방지비용 + 대물복구비용
    - **현장출동비용 청구 (Field Dispatch Cost Invoice)**: For 선견적요청 (pre-estimate request) cases - displays only 현장출동비용
  - Invoice data is persisted in the database (invoiceDamagePreventionAmount, invoicePropertyRepairAmount, invoiceRemarks, fieldDispatchInvoiceAmount, fieldDispatchInvoiceRemarks)
  - PDFs can be generated and emailed to recipients

### System Design Choices
- **Frontend**: React with TypeScript, Wouter for routing, TanStack Query for data fetching, React Hook Form with Zod for form validation, Shadcn UI and Tailwind CSS for component styling, and Lucide React for icons.
- **Backend**: Express.js, bcrypt, express-session, memorystore, and Zod for API validation.
- **Database**: PostgreSQL (Neon-backed) with Drizzle ORM for persistent data storage and automatic schema management.
  - **IMPORTANT**: 스키마 변경 시 반드시 DEV 데이터베이스에 동기화해야 합니다:
    ```bash
    DATABASE_URL="$DEV_DATABASE_URL" npm run db:push
    ```
  - 또는 스크립트 사용: `bash scripts/db-push-dev.sh`

## External Dependencies
- **Frontend Libraries**: React, TypeScript, Wouter, TanStack Query, React Hook Form, Zod, Shadcn UI, Tailwind CSS, Lucide React.
- **Backend Libraries**: Express.js, bcrypt, express-session, memorystore, Zod.
- **Database**: PostgreSQL (Neon-backed) with Drizzle ORM.

## Recent Changes (2026-01-14)
- **Intake Form Redesign**: Completely redesigned the 접수단계 (intake) tab with a cleaner table-style layout
  - 5 main sections with vertical headers: [기본정보], [보험정보], [의뢰사/심사사/조사사], [피보험자/피해자], [배당사항]
  - Required fields marked with red asterisks (*): 본사담당자, 보험사, 의뢰사, 의뢰자, 심사사, 심사자, 피보험자, 주소, 순방 및 대물 선택, 사고유형, 복구방식
  - Removed "사고내용" and "피해사항(선택)" sections per user request
  - Reduced file size from ~4500 to ~1400 lines while preserving all essential functionality
  - Checkboxes for 손해방지/피해세대복구 retained in [배당사항] section
  - Bottom buttons remain: 초기화 (reset), 저장 (save), 접수완료 (submit)

## Recent Changes (2026-01-03)
- **Field Survey Status Workflow Update**: Updated the field survey approval workflow
  - 심사 (Review) → status "1차승인" (unchanged)
  - 이메일 전송 (Email Send) → status "현장정보제출" (NEW)
  - 승인 (Approval) → status "복구요청" (NEW - was not updating status before)
  - Email button is visible when status is "1차승인" (after review approved)
  - Approval button is enabled when status is "현장정보제출" (after email sent)

## Recent Changes (2025-12-31)
- **Server Capacity Increase**: Fixed production 500 error for large document files.
  - Increased Express JSON body limit from 50MB to 500MB
  - Increased server timeout to 5 minutes (300 seconds)
  - Increased keepAliveTimeout to 2 minutes
  - Documents now load with full fileData (no lazy loading)