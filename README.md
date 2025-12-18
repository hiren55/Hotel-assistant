# Hotel Assistant

AI-powered hotel management and chatbot platform - A multi-tenant SaaS solution providing AI chatbots and booking capabilities for small-to-medium hotels.

## Project Structure

```
hotel-assistant/
├── apps/
│   ├── api/              # Backend API (NestJS)
│   ├── admin/            # Admin Portal (Next.js)
│   └── widget/           # Embeddable Chat Widget (Preact)
├── packages/
│   ├── shared/           # Shared types and utilities
│   ├── ui/               # Shared UI components
│   └── config/           # Shared configuration
├── docs/                 # Documentation
├── scripts/              # Build and deployment scripts
└── infrastructure/       # IaC files
```

## Tech Stack

| Layer             | Technology                                                |
| ----------------- | --------------------------------------------------------- |
| Frontend (Admin)  | Next.js 14, React 18, TypeScript, Tailwind CSS, ShadCN/UI |
| Frontend (Widget) | Preact, TypeScript, Vite                                  |
| Backend           | NestJS, TypeScript, Prisma ORM                            |
| Database          | PostgreSQL                                                |
| Cache             | Redis                                                     |
| AI                | OpenAI / Anthropic Claude                                 |
| Email             | Resend                                                    |

## Prerequisites

- Node.js 20 LTS
- pnpm 8+
- Docker & Docker Compose
- PostgreSQL (via Docker)
- Redis (via Docker)

## Getting Started

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd hotel-assistant

# Install dependencies
pnpm install
```

### 2. Environment Setup

```bash
# Copy environment files
cp .env.example .env
cp apps/api/.env.example apps/api/.env

# Edit .env files with your configuration
```

### 3. Start Local Services

```bash
# Start PostgreSQL and Redis
docker-compose up -d

# Verify services are running
docker-compose ps
```

### 4. Database Setup

```bash
# Generate Prisma client
pnpm db:generate

# Run migrations
pnpm db:migrate

# Seed development data (optional)
pnpm db:seed
```

### 5. Start Development Servers

```bash
# Start all apps in development mode
pnpm dev

# Or start individual apps
pnpm --filter api dev      # API on port 3001
pnpm --filter admin dev    # Admin on port 3000
pnpm --filter widget dev   # Widget on port 3002
```

## Available Scripts

| Command            | Description                        |
| ------------------ | ---------------------------------- |
| `pnpm dev`         | Start all apps in development mode |
| `pnpm build`       | Build all apps                     |
| `pnpm lint`        | Run linting                        |
| `pnpm lint:fix`    | Fix linting issues                 |
| `pnpm type-check`  | TypeScript type checking           |
| `pnpm test`        | Run tests                          |
| `pnpm clean`       | Clean build outputs                |
| `pnpm db:generate` | Generate Prisma client             |
| `pnpm db:migrate`  | Run database migrations            |
| `pnpm db:seed`     | Seed database                      |
| `pnpm db:studio`   | Open Prisma Studio                 |

## Services

| Service      | URL                            | Description                |
| ------------ | ------------------------------ | -------------------------- |
| Admin Portal | http://localhost:3000          | Hotel management dashboard |
| API          | http://localhost:3001          | Backend REST API           |
| API Docs     | http://localhost:3001/api/docs | Swagger documentation      |
| Widget Dev   | http://localhost:3002          | Widget development server  |
| MailHog      | http://localhost:8025          | Email testing UI           |

## Architecture

### Multi-Tenant Design

- Row-level security with `hotel_id` on all tenant tables
- Defense in depth security model
- Cross-tenant access returns 404 (not 403) for security

### API Versioning

- URL path versioning: `/api/v1/...`
- Backward compatibility guaranteed within major versions

### Authentication

- JWT-based authentication with RS256 signing
- Refresh token rotation
- Role-based access control (RBAC)
- MFA support

## Development Guidelines

### Code Quality

- TypeScript strict mode enabled
- ESLint + Prettier for code formatting
- Conventional commits enforced
- Pre-commit hooks with Husky

### Naming Conventions

- Files: kebab-case (`hotel-service.ts`)
- Classes: PascalCase (`HotelService`)
- Functions: camelCase (`getHotel`)
- Constants: SCREAMING_SNAKE_CASE (`MAX_RETRY_COUNT`)

### Git Workflow

- `main` - Production branch
- `develop` - Integration branch
- `feature/*` - Feature branches
- `hotfix/*` - Emergency fixes

## Environment Variables

### Required Variables

```env
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/hotel_assistant"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="your-secret-key"

# AI Provider
OPENAI_API_KEY="sk-..."
# or
ANTHROPIC_API_KEY="sk-ant-..."
```

See `.env.example` files for complete list.

## Deployment

### Production Build

```bash
# Build all apps
pnpm build

# Start production server
pnpm start
```

### Docker Deployment

```bash
# Build and run with Docker
docker-compose -f docker-compose.prod.yml up -d
```

## Contributing

1. Create a feature branch from `develop`
2. Make your changes
3. Run tests and linting
4. Submit a pull request

## License

Proprietary - All rights reserved
