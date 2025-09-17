# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Frontend Development
- `npm run dev` - Start Vite development server (runs on http://localhost:5173)
- `npm run build` - Build frontend for production
- `npm run lint` - Run ESLint for code quality checks
- `npm run preview` - Preview production build locally

### Backend Development
- `npx tsc -p tsconfig.node.json` - Compile TypeScript backend code to dist/
- `node ./dist/backend/starter.js` - Start backend servers after compilation
- `npm run build:backend` - Compile backend TypeScript (equivalent to first command)
- `npm run dev:backend` - Compile and start backend in one command

### Full Development Setup
To run the complete development environment:
```bash
# Terminal 1: Start frontend
npm run dev

# Terminal 2: Build and start backend
npm run dev:backend
```

## Architecture Overview

SolTerm is a full-stack SSH server management platform with the following key architectural components:

### Frontend Architecture (React + TypeScript)
- **Framework**: React 19 with TypeScript, built using Vite
- **UI Library**: Shadcn/UI components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design system
- **State Management**: React hooks and context (TabProvider for tab management)
- **Routing**: Custom tab-based navigation system instead of traditional routing
- **Terminal Integration**: XTerm.js for terminal emulation with SSH connections

### Backend Architecture (Node.js + TypeScript)
- **Runtime**: Node.js with Express.js servers
- **Database**: SQLite with Drizzle ORM for data persistence
- **Architecture**: Multi-server microservices approach:
  - Port 8081: SSH host management, authentication, user management
  - Port 8083: SSH tunnel management  
  - Port 8084: File manager operations
  - Port 8085: Server statistics and monitoring

### Key Components

#### Database Schema (src/backend/database/db/schema.ts)
- `users`: User accounts with OIDC and TOTP support
- `sshData`: SSH host configurations with authentication details
- `fileManagerRecent/Pinned/Shortcuts`: File manager metadata
- `dismissedAlerts`: User alert management

#### API Layer (src/ui/main-axios.ts)
Central API client with multiple service endpoints:
- SSH host CRUD operations
- SSH tunnel management
- File manager operations (connect, file operations, metadata)
- Server monitoring and statistics
- Authentication and user management
- Comprehensive error handling with automatic token refresh

#### Frontend Views
- **Homepage**: Authentication and landing page
- **Host Manager**: SSH connection management with tags and folders
- **Terminal**: Multi-pane terminal interface with tab support
- **File Manager**: Remote file editing with syntax highlighting
- **Tunnel Manager**: SSH tunnel creation and monitoring
- **Server Stats**: System monitoring dashboard
- **Admin/User Profiles**: User management interfaces

### Security Features
- JWT-based authentication with automatic token refresh
- OIDC (OpenID Connect) integration for SSO
- TOTP (Time-based One-Time Password) 2FA support
- SSH key and password authentication
- Secure session management for SSH connections

### Internationalization
- i18next integration for multi-language support
- Korean language support implemented
- Language switcher component available

## Development Guidelines

### Code Organization
- **Frontend components**: Organized by feature in `src/ui/` with shared components in `src/components/ui/`
- **Backend modules**: Organized by service in `src/backend/` with shared database code
- **API routes**: All API calls centralized in `src/ui/main-axios.ts`
- **Database operations**: Managed through Drizzle ORM with schema definitions

### Styling Conventions
- Use Tailwind CSS classes following the existing design system
- Leverage Shadcn/UI components for consistency
- Follow the established color scheme and spacing patterns
- Maintain responsive design patterns for mobile compatibility

### Backend Development
- SSH operations use the ssh2 library for secure connections
- WebSocket integration for real-time terminal communication
- Multi-port architecture allows independent service scaling
- Comprehensive error handling and logging throughout

### Testing
- No specific test framework configured - check with the team for preferred testing approach
- Manual testing should cover SSH connections, file operations, and user authentication flows

## Key Dependencies

### Frontend
- React 19 with TypeScript for UI framework
- XTerm.js for terminal emulation
- CodeMirror for file editing with syntax highlighting
- Radix UI + Shadcn/UI for component library
- React Hook Form + Zod for form validation
- i18next for internationalization

### Backend  
- Express.js for web server framework
- ssh2 for SSH protocol implementation
- better-sqlite3 + Drizzle ORM for database operations
- WebSocket (ws) for real-time communication
- bcryptjs for password hashing
- jsonwebtoken + jose for JWT handling
- speakeasy for TOTP 2FA implementation