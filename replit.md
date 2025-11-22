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
- **Responsiveness**: Designed for optimal viewing across mobile, tablet, and desktop devices.
  - **Mobile Header (< 1024px)**: Simplified 58px header with logo and logout button only
  - **Desktop Header (>= 1024px)**: Full 89px header with logo, navigation menu, and user profile
  - **Mobile Dashboard**: Profile card, simplified stats, separator, and staff summary section
  - **Desktop Dashboard**: Traditional stats cards, progress summary, right sidebar
- **Theming**: Supports dark mode.
- **Feedback**: Implements beautiful loading and error states for improved user experience.
- **Design Guidelines**: Adherence to a strict design guide emphasizing consistent spacing (Tailwind 2, 4, 6, 8 units), blur effects for depth, and Noto Sans KR font, prioritizing accessibility.

### Technical Implementations
- **Authentication**: Username-based login, bcrypt for password hashing, express-session with memorystore for session management, and robust role-based access control (Assessor, Investigator, Insurer, Partner, Client, Administrator) with protected routes.
- **User Management (Admin)**: Includes a user account table with search and role-based filtering, a detailed right-sliding modal for account viewing and editing, and a two-step account creation flow with form validation, password generation, and cancellation confirmations. It supports password resets and soft deletion of user accounts.
- **Case Intake System**: Features a multi-section collapsible form for creating new insurance claim cases, including automatic case number generation (CLM-{timestamp}), and extensive fields for basic, insurance, client, assessor, investigator, insured, and victim information.
- **Date Handling**: All date creations are in Korean Standard Time (KST).

### Feature Specifications
- **Home**: Overview of progress, key metrics, and quick navigation for all users.
- **Reception Management**: New water damage case registration and management, including assigning repair companies based on service areas.
- **Field Survey Workflow** (Sequential Process): 
  - **CRITICAL**: All field survey pages work on the SAME selected case from 현장입력, connected via `localStorage.selectedFieldSurveyCaseId`
  - **Complete Workflow Sequence** (하나의 접수건에 대한 전체 처리 프로세스):
    1. **현장입력** (`/field-survey/management`) → Select case and input field investigation data
    2. **도면작성** (`/field-survey/drawing`) → Create damage scope drawings
    3. **증빙자료 등록** (`/field-survey/documents`) → Upload photos and supporting documents
    4. **견적서 작성** (`/field-survey/estimate`) → Create cost estimates
    5. **현장출동보고서** (`/field-survey/report`) → Generate final field dispatch report
  - **Field Survey Management Page** (`/field-survey/management`): Multi-section form with collapsible sections for basic info, damage assessment, insurance details, insured/victim information, and damage recovery method selection.
  - **Field Survey Sidebar Menu** (updated November 13, 2025):
    - **현장입력** (`/field-survey/management`): Field management page
    - **도면작성** (`/field-survey/drawing`): Drawing creation page
    - **증빙자료 등록** (`/field-survey/documents`): Documents upload page - IMPLEMENTED with PostgreSQL persistence
    - **견적서 작성** (`/field-survey/estimate`): Estimate creation page (placeholder)
    - **현장출동보고서** (`/field-survey/report`): Field dispatch report page (placeholder)
  - **Drawing Creation Page** (`/field-survey/drawing`): Digital drawing workspace with dedicated layout separate from FieldSurveyLayout.
    - **Layout Structure**: Uses DrawingLayout component with GlobalHeader + dedicated content area
    - **Left Sidebar (180px)**: Menu navigation with same updated labels as Field Survey Sidebar (현장입력, 도면작성, 증빙자료 등록, 견적서 작성, 현장출동보고서)
    - **Case Information Display**: 
      - Left sidebar: Shows case info with blue dot, insurance company/accident number, and case number
      - Canvas top-left: "작성중인 건" display showing selected case from 현장입력
    - **Canvas Area**: Full-screen grid background (10px squares, rgba(218,218,218,0.5)) - no boundary limits for free drawing anywhere
    - **Bottom-Center Toolbar**: 4 drawing tools (선택/pointer, 이미지 업로드/upload, 사각형/rectangle, 누수 지점/leak marker) with active state highlighting
    - **Top-Right Save Buttons**: "저장" and "PNG 저장" buttons for saving work and exporting as PNG
    - **Control UI**: Shows when object selected - lock/delete buttons, width/height inputs for rectangles (floating above selected entity)
    - **Drawing Tools**:
      - **Pointer Tool**: Select, drag (move) images and rectangles, show control UI
      - **Image Upload Tool**: Upload image files only (image/* filter), auto-resize to max 300px width
      - **Rectangle Tool**: Draw by drag, text input, width/height in mm labels (bottom and right side)
      - **Leak Marker Tool**: Click to place red target marker icon
    - **Drag & Lock Features**:
      - ActiveTransform state machine tracks drag operations (entityType, entityId, mode, start positions)
      - NO boundary clamping - free drawing anywhere on screen
      - Drag cleared on mouseUp, mouseLeave, or e.buttons === 0 (prevents drag state leak)
      - Cursor changes to "move" when hovering unlocked draggable items
      - Lock button toggles locked state (locked items cannot be dragged)
      - 8-handle resize system (4 corners + 4 edges) for rectangles and images with activeTransformRef for stable delta accumulation
    - **PNG Export**: 
      - High-resolution export (2x scale) using html2canvas library
      - UI elements (toolbar, buttons, control panels) temporarily hidden during capture via data-ui selectors
      - Robust error handling with try/finally to ensure UI restoration even on failures
      - Downloads as `도면_${date}.png` with success/error toast notifications
    - **Critical Layout**: Uses h-full/min-h-0 with flex-shrink-0 on fixed elements to prevent vertical overflow and ensure single viewport workspace without double scrollbars
  - **Documents Upload Page** (`/field-survey/documents`): Document and photo upload system with persistent storage.
    - **Database Persistence**: caseDocuments table with Base64 file encoding for binary storage in PostgreSQL
    - **Features**:
      - Upload files via drag-and-drop or click
      - Progress bar during upload
      - Category management (전체, 현장, 수리중, 복구완료, 청구, 개인정보)
      - File download (filename click or download icon)
      - Image thumbnails (64x64px)
      - File metadata display (name, size, category)
      - Delete functionality
      - Toast notifications for upload/category change
    - **Authorization**: 관리자/심사사 can manage all documents, others only their own
    - **Case Information Display**: "작성중인 건" showing selected case from 현장입력
- **Restoration Estimation (Drawing)**: Digital drawing for damage scope and restoration area calculation, automatically linking to estimates and reports.
- **Image & File Management**: Upload and manage initial, intermediate, final images, and supporting documents with case-specific access control.
- **Estimate Management** (`/field-survey/estimate`): Create and submit restoration cost estimates with automatic calculations and PDF/Excel export.
  - **복구면적 산출표** (Restoration Area Calculation Table): Dynamic table with DB-driven dropdowns
    - **Database Integration**: All dropdown values (장소/room category, 위치/location, 공사내용/work name) loaded from masterData table
    - **Loading Guards**: "항목 추가" button disabled until master data loads, handleReset shows toast if master data not ready
    - **Row Operations**: Add rows, delete selected rows, reset to single blank row with DB defaults
    - **Category Tabs**: 복구면적 산출표, 견적내역서, 견적서
    - **Versioning**: Save estimates with version tracking, view and restore previous versions
  - **Database Persistence**: Estimates stored in caseEstimates table with versioned JSON data
  - **Case Information Display**: "작성중인 건" showing selected case from 현장입력
- **Master Data Management** (기준정보 관리): Administrator-only feature for managing dropdown options used throughout the system.
  - **Database Table**: `masterData` with columns (id: serial, category: varchar, label: varchar)
  - **Categories**: 
    - "장소" (room_category): 거실, 주방, 침실, 욕실 + custom additions
    - "위치" (location): 천장, 벽면, 바닥 + custom additions
    - "공사내용" (work_name): 도배, 장판, 싱크대, 타일 + custom additions
  - **API Endpoints**:
    - GET /api/master-data?category=room_category|location|work_name
    - POST /api/master-data (admin only) - Add new item
    - DELETE /api/master-data/:id (admin only) - Remove item
  - **Access Control**: Only administrators can add/delete master data items
  - **Real-time Updates**: Changes immediately reflect in all dropdowns via queryClient.invalidateQueries
  - **Integration**: Used in field-estimate.tsx for 복구면적 산출표 dropdowns
- **Field Reports**: Generate comprehensive reports integrating data from field surveys, drawings, images, and estimates for submission to insurance companies.
- **Progress Management**: Track case progress, manage approvals/rejections, and send notifications.
- **Finance & Settlement**: View statistics, manage settlements, track receivables, and match payments.

### System Design Choices
- **Frontend**: React with TypeScript, Wouter for routing, TanStack Query for data fetching, React Hook Form with Zod for form validation, Shadcn UI and Tailwind CSS for component styling, and Lucide React for icons.
- **Backend**: Express.js, bcrypt, express-session, memorystore, and Zod for API validation.
- **Database**: PostgreSQL (Neon-backed) with Drizzle ORM for persistent data storage and automatic schema management.

## Recent Changes

**November 22, 2025 - Automatic Date Recording & 2-Case Creation Fix**
- **Automatic Date Recording**: Status changes now auto-populate corresponding date fields:
  - "접수완료" → receptionDate + assignmentDate
  - "1차승인" → firstApprovalDate
  - "복구요청(2차승인)" → secondApprovalDate
  - "청구" → claimDate
- **2-Case Creation Fix**: When both 손해방지 and 피해세대복구 are checked:
  - Draft case is properly deleted before creating 2 new cases
  - Creates CLM-{timestamp}-1 (손해방지) and CLM-{timestamp}-2 (피해세대복구)
  - Works correctly even when resuming from draft ("이어서 작성하기")
- Added DELETE /api/cases/:id endpoint (only allows deleting "배당대기" status cases)
- Added date tracking fields: firstApprovalDate (1차 승인일), secondApprovalDate (2차 승인일)
- Updated comprehensive progress "일자" tab with 8 date fields
- **Damage Details Optional**: 피해사항 섹션을 선택사항으로 변경 - 피해내용 입력 없이도 접수완료 가능

## External Dependencies

- **Frontend Libraries**: React, TypeScript, Wouter, TanStack Query, React Hook Form, Zod, Shadcn UI, Tailwind CSS, Lucide React.
- **Backend Libraries**: Express.js, bcrypt, express-session, memorystore, Zod.
- **Database**: PostgreSQL (Neon-backed) with Drizzle ORM.