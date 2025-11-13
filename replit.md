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
- **Field Survey**: Input field investigation results and details by repair companies.
  - **Field Survey Management Page** (`/field-survey/management`): Multi-section form with collapsible sections for basic info, damage assessment, insurance details, insured/victim information, and damage recovery method selection.
  - **Field Survey Sidebar Menu** (updated November 13, 2025):
    - **현장입력** (`/field-survey/management`): Field management page
    - **도면작성** (`/field-survey/drawing`): Drawing creation page
    - **증빙자료 등록** (`/field-survey/documents`): Documents upload page (placeholder)
    - **견적서 작성** (`/field-survey/estimate`): Estimate creation page (placeholder)
    - **현장출동보고서** (`/field-survey/report`): Field dispatch report page (placeholder)
  - **Drawing Creation Page** (`/field-survey/drawing`): Digital drawing workspace with dedicated layout separate from FieldSurveyLayout.
    - **Layout Structure**: Uses DrawingLayout component with GlobalHeader + dedicated content area
    - **Left Sidebar (180px)**: Menu navigation with updated labels
    - **Case Information Display**: Shows case name (M0숭례문역4) and case number (ZK2109043) with blue dot indicator
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
- **Restoration Estimation (Drawing)**: Digital drawing for damage scope and restoration area calculation, automatically linking to estimates and reports.
- **Image & File Management**: Upload and manage initial, intermediate, final images, and supporting documents with case-specific access control.
- **Estimate Management**: Create and submit restoration cost estimates with automatic calculations and PDF/Excel export.
- **Field Reports**: Generate comprehensive reports integrating data from field surveys, drawings, images, and estimates for submission to insurance companies.
- **Progress Management**: Track case progress, manage approvals/rejections, and send notifications.
- **Finance & Settlement**: View statistics, manage settlements, track receivables, and match payments.
- **Admin Menu**: Manage master data, users, roles, permissions, and send notifications.

### System Design Choices
- **Frontend**: React with TypeScript, Wouter for routing, TanStack Query for data fetching, React Hook Form with Zod for form validation, Shadcn UI and Tailwind CSS for component styling, and Lucide React for icons.
- **Backend**: Express.js, bcrypt, express-session, memorystore, and Zod for API validation.
- **Database**: PostgreSQL (Neon-backed) with Drizzle ORM for persistent data storage and automatic schema management.

## External Dependencies

- **Frontend Libraries**: React, TypeScript, Wouter, TanStack Query, React Hook Form, Zod, Shadcn UI, Tailwind CSS, Lucide React.
- **Backend Libraries**: Express.js, bcrypt, express-session, memorystore, Zod.
- **Database**: PostgreSQL (Neon-backed) with Drizzle ORM.