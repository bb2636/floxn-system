# Floxn System - 견적관리시스템 (Quotation Management System)

## Overview

Floxn System is a quotation management system (견적관리시스템). This appears to be a new or early-stage project with minimal existing codebase. The repository currently contains basic configuration files and project documentation, indicating the project is in its initial setup phase and will require foundational architecture decisions to be made as development progresses.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

As this project is in its early stages, the following architectural recommendations should be considered when building out the quotation management system:

### Recommended Stack
- **Frontend**: React with TypeScript for type-safe component development
- **Backend**: Node.js with Express for API services
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Styling**: Tailwind CSS for utility-first styling

### Core Features to Implement
1. **Quotation Management**: Create, read, update, delete quotations
2. **Customer Management**: Track customer information linked to quotations
3. **Product/Service Catalog**: Manage items that can be added to quotations
4. **User Authentication**: Secure access to the system
5. **Reporting**: Generate reports on quotation status and history

### Design Patterns
- RESTful API design for backend services
- Component-based architecture for frontend
- Repository pattern for data access layer

## External Dependencies

### Required Services
- **Database**: PostgreSQL for persistent data storage
- **Authentication**: Session-based or JWT authentication (to be determined)

### Development Tools
- **Semgrep**: Security scanning configured for TypeScript with CORS regex validation rules
- **TypeScript**: Type checking for improved code quality

### Potential Integrations
- PDF generation for quotation exports
- Email service for sending quotations to customers
- File storage for attachments (if needed)