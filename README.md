<h1 align="center">LEO — AI Agent Platform</h1>

<p align="center">
  Платформа для создания, настройки и управления AI-агентами с базой знаний, Telegram-интеграцией и аналитикой.
</p>

## Introduction

LEO — SaaS-платформа для создания умных AI-агентов. Загружайте документы, подключайте к Telegram и получайте аналитику по каждому диалогу.

## Tech Stack

- **Framework**: Next.js 14 (App Router), TypeScript
- **Auth**: Auth.js v5
- **Database**: PostgreSQL 16 + Prisma ORM
- **AI**: Claude (Anthropic), Gemini (Google) через LiteLLM proxy
- **UI**: Tailwind CSS + Shadcn/ui
- **Email**: Resend + React Email
- **Vector DB**: ChromaDB
- **Integrations**: Telegram (grammY)

## Architecture

- **leo** (Next.js) — frontend/backend, dashboard, billing
- **ai-master** — AI gateway + agent orchestrator + LiteLLM proxy
- **PostgreSQL** — основная БД
- **ChromaDB** — векторная БД для RAG

## Installation

1. Install dependencies:

```sh
npm install
```

2. Copy `.env.example` to `.env.local` and update the variables:

```sh
cp .env.example .env.local
```

3. Start the development server:

```sh
npm run dev
```

## Deployment

```sh
./deploy.sh
```

Uses Docker Compose with Traefik reverse proxy. See `docker-compose.prod.yml` for details.

## Key Commands

- **Local Dev**: `npm run dev`
- **Deployment**: `./deploy.sh`
- **Database Studio**: `npx prisma studio`
- **Seed DB**: `npx prisma db seed`
