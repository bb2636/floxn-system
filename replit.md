# 보험 관리 시스템 (Insurance Management System)

## Overview

This project is an Insurance Accident Management System designed for the Korean market, providing a web application to manage the entire lifecycle of insurance claims, from reception to closure. The system aims to streamline the process, offering a comprehensive view of claim progression. It features robust authentication with role-based access control, a detailed administrator panel for user management, and an intuitive dashboard. The system is built with a focus on a clean, responsive UI/UX, incorporating modern design principles and a clear branding identity (FLOXN).

## User Preferences

- I prefer simple language.
- I want iterative development.
- Ask before making major changes.
- I prefer detailed explanations.
- Do not make changes to the `design_guidelines.md` file.

## System Architecture

The system is a full-stack web application with a React-based frontend and an Express.js backend.

### UI/UX Decisions
- **Language**: Korean-first interface using Pretendard font.
- **Branding**: FLOXN branding with a distinctive cream/orange and purple/blue gradient background.
- **Responsiveness**: Designed for optimal viewing across mobile, tablet, and desktop devices.
- **Theming**: Supports dark mode.
- **Feedback**: Implements beautiful loading and error states for improved user experience.
- **Design Guidelines**: Adherence to a strict design guide emphasizing consistent spacing (Tailwind 2, 4, 6, 8 units), blur effects for depth, and Noto Sans KR font, prioritizing accessibility.

### Technical Implementations
- **Authentication**: Username-based login, bcrypt for password hashing, express-session with memorystore for session management, role-based access control (Assessor, Investigator, Insurer, Partner, Administrator), and protected routes.
- **User Management (Admin)**:
    - User account table with search and role-based filtering.
    - **Detailed Account View Modal**: Right-sliding panel (609px width) with role-specific section titles:
      - First section: "기본 정보" for 보험사 only; "사용자 정보" for all other roles (심사사, 조사사, 협력사, 관리자)
      - Second section: Role-specific titles (e.g., "심사사 정보", "보험사 정보", "관리자 정보")
    - **Account Creation**: Two-step flow with form validation, password generation, and cancellation confirmation modals.
      - Position field: Dropdown selection with standard Korean titles (사원, 주임, 대리, 과장, 차장, 부장, 이사, 상무, 전무, 부사장, 사장, 대표이사)
      - Partner-specific fields: Bank details (name, account number, account holder), service regions (tag-based selection with search), file attachments
    - Password reset functionality (defaulting to "0000").
    - Soft delete for user accounts, preserving historical data.
- **Dashboard**: Comprehensive overview as the main landing page post-login.
- **API Security**: Implemented with session-based authentication, role-based authorization for sensitive endpoints, Zod for request validation, CSRF protection via sameSite cookies, and session timeouts.

### Feature Specifications
- **Role-Based Access Control**: Supports five distinct roles: Assessor, Investigator, Insurer, Partner, and Administrator, each with specific permissions.
- **Account Creation**: Administrators can create new user accounts, with automatic password generation and optional notification via email/SMS.
- **Password Reset**: Administrators can reset user passwords.
- **Account Deletion**: Soft delete functionality ensures that account history is preserved while the account is marked inactive.
- **KST Date Handling**: All date creations are in Korean Standard Time (KST).

### System Design Choices
- **Frontend**: React with TypeScript, Wouter for routing, TanStack Query for data fetching, React Hook Form with Zod for form validation, Shadcn UI and Tailwind CSS for component styling, and Lucide React for icons.
- **Backend**: Express.js with bcrypt for password hashing, express-session for session management, and memorystore as an in-memory session store. Zod is used for API validation.
- **Database**: Currently uses an in-memory storage (MemStorage) with future plans for PostgreSQL integration in production.

## External Dependencies

- **Frontend Libraries**:
    - React
    - TypeScript
    - Wouter (routing)
    - TanStack Query (data fetching)
    - React Hook Form
    - Zod (form validation)
    - Shadcn UI (component library)
    - Tailwind CSS (styling)
    - Lucide React (icons)
- **Backend Libraries**:
    - Express.js
    - bcrypt (password hashing)
    - express-session (session management)
    - memorystore (in-memory session store)
    - Zod (API validation)
- **Database**:
    - In-memory storage (MemStorage) - intended for development/testing, with PostgreSQL as a planned production replacement.
- **Development Tools**:
    - Vite (development server)