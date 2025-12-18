# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hotel Assistant is a multi-tenant SaaS platform providing AI chatbots and booking capabilities for small-to-medium hotels. It uses a pnpm monorepo with Turborepo for orchestration.

## Common Commands

```bash
# Development
pnpm dev                    # Start all apps concurrently
pnpm --filter api dev       # Start API only (port 3001)
pnpm --filter admin dev     # Start Admin only (port 3000)
pnpm --filter widget dev    # Start Widget only (port 3002)

# Building
pnpm build                  # Build all apps
pnpm --filter api build     # Build specific app

# Testing
pnpm test                   # Run all tests
pnpm --filter api test      # Run API tests
pnpm --filter api test:e2e  # Run API E2E tests
pnpm --filter api test:auth # Run auth-specific E2E tests

# Linting & Type Checking
pnpm lint                   # Lint all packages
pnpm lint:fix               # Fix lint issues
pnpm type-check             # TypeScript check all packages

# Database (runs in apps/api)
pnpm db:generate            # Generate Prisma client
pnpm db:migrate             # Run migrations
pnpm db:seed                # Seed development data
pnpm db:studio              # Open Prisma Studio

# Utilities
pnpm format                 # Format all files with Prettier
```

## Architecture

### Monorepo Structure

- **apps/api**: NestJS backend with REST API, JWT auth, Prisma ORM
- **apps/admin**: Next.js 14 admin portal with React Query, Zustand, ShadCN/UI
- **apps/widget**: Preact embeddable chat widget built with Vite
- **packages/shared**: Shared TypeScript types and utilities (built with tsup)

### Multi-Tenant Design

All tenant data is scoped by `hotel_id`. The system uses row-level security with defense-in-depth:

- Cross-tenant access returns 404 (not 403) for security
- JWT tokens contain hotel context
- Guards enforce tenant isolation (`HotelAccessGuard`)

### API Structure (NestJS)

- Global prefix: `/api/v1`
- Swagger docs at `/api/docs` (development only)
- Feature modules in `apps/api/src/modules/`: auth, hotels, rooms, bookings, chat, knowledge, email, widget, storage
- Common utilities in `apps/api/src/common/`: filters, guards, interceptors, middleware, services

### AI Providers

Chat module supports multiple AI providers via provider interface pattern:

- `apps/api/src/modules/chat/providers/openai.provider.ts`
- `apps/api/src/modules/chat/providers/claude.provider.ts`

### Database Schema

PostgreSQL with Prisma ORM. Key models:

- `Hotel` - tenant entity
- `User` - staff with roles (super_admin, hotel_owner, hotel_manager, hotel_staff)
- `Room`, `Booking` - core business entities
- `HotelKnowledge` - AI knowledge base per hotel
- `Conversation`, `ConversationMessage` - chat history

Schema at `apps/api/prisma/schema.prisma`

## Naming Conventions

- Files: kebab-case (`hotel-service.ts`)
- Classes: PascalCase (`HotelService`)
- Functions/variables: camelCase (`getHotel`)
- Constants: SCREAMING_SNAKE_CASE (`MAX_RETRY_COUNT`)

## Commit Message Format

Conventional commits enforced via commitlint:

- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`, `security`
- Subject must be lowercase, max 72 characters
- Body lines max 100 characters

Example: `feat: add room availability check endpoint`

## Services (Development)

| Service      | URL                            |
| ------------ | ------------------------------ |
| Admin Portal | http://localhost:3000          |
| API          | http://localhost:3001          |
| Swagger Docs | http://localhost:3001/api/docs |
| Widget Dev   | http://localhost:3002          |
| MailHog      | http://localhost:8025          |
