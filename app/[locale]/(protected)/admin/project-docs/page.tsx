'use client'

import * as React from 'react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// ============================
// DATA
// ============================

const tabs = [
  { id: 'overview', label: 'Обзор' },
  { id: 'architecture', label: 'Архитектура' },
  { id: 'gateway', label: 'Gateway' },
  { id: 'orchestrator', label: 'Orchestrator' },
  { id: 'runtime', label: 'Runtime' },
  { id: 'frontend', label: 'Frontend' },
  { id: 'database', label: 'База данных' },
  { id: 'billing', label: 'Биллинг' },
  { id: 'infra', label: 'Инфраструктура' },
] as const

type TabId = (typeof tabs)[number]['id']

// ============================
// SECTION COMPONENTS
// ============================

function SectionCard({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className='pb-3'>
        <CardTitle className='text-lg'>{title}</CardTitle>
        {description && (
          <CardDescription>{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className='text-sm leading-relaxed space-y-2'>
        {children}
      </CardContent>
    </Card>
  )
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className='bg-muted rounded-md p-3 text-xs overflow-x-auto whitespace-pre-wrap'>
      <code>{children}</code>
    </pre>
  )
}

function Endpoint({
  method,
  path,
  desc,
}: {
  method: string
  path: string
  desc: string
}) {
  const colors: Record<string, string> = {
    GET: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    POST: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    PATCH: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    DELETE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    PUT: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  }
  return (
    <div className='flex items-start gap-2 py-1'>
      <Badge
        variant='outline'
        className={cn('text-[10px] font-mono shrink-0 w-14 justify-center', colors[method])}
      >
        {method}
      </Badge>
      <code className='text-xs font-mono text-foreground shrink-0'>{path}</code>
      <span className='text-muted-foreground text-xs'> — {desc}</span>
    </div>
  )
}

function FileRef({ path, desc }: { path: string; desc?: string }) {
  return (
    <div className='flex items-start gap-2 py-0.5'>
      <code className='text-xs font-mono text-foreground bg-muted px-1.5 py-0.5 rounded shrink-0'>
        {path}
      </code>
      {desc && <span className='text-xs text-muted-foreground'> — {desc}</span>}
    </div>
  )
}

// ============================
// TAB CONTENT
// ============================

function OverviewTab() {
  return (
    <div className='grid gap-4 md:grid-cols-2'>
      <SectionCard title='Что такое LEO' description='Платформа для создания AI-агентов'>
        <p>
          LEO — SaaS-платформа для создания, настройки и управления AI-агентами.
          Агенты работают в Telegram и веб-чате, используют базу знаний (RAG),
          поддерживают расписание, конфликт-детекцию и автоматическое тестирование.
        </p>
        <p className='text-muted-foreground'>
          Монетизация через PU (Processing Units) — подписочная модель с тарифами
          BASIC / PRO / BUSINESS / ENTERPRISE. Оплата через Tochka Bank.
        </p>
      </SectionCard>

      <SectionCard title='Технологический стек'>
        <div className='grid grid-cols-2 gap-x-4 gap-y-1'>
          <div>
            <p className='font-medium'>Frontend</p>
            <ul className='text-muted-foreground list-disc pl-4'>
              <li>Next.js 14.2.5 (App Router)</li>
              <li>React 18 + TypeScript</li>
              <li>Tailwind CSS 3 + Shadcn/ui</li>
              <li>next-intl (i18n, локаль ru)</li>
              <li>next-themes (темная тема)</li>
              <li>Recharts (графики)</li>
            </ul>
          </div>
          <div>
            <p className='font-medium'>Backend / AI</p>
            <ul className='text-muted-foreground list-disc pl-4'>
              <li>Prisma ORM + PostgreSQL</li>
              <li>NextAuth v5 beta (JWT)</li>
              <li>LiteLLM (прокси LLM)</li>
              <li>ChromaDB (вектора)</li>
              <li>Docker (контейнеры агентов)</li>
              <li>grammY (Telegram боты)</li>
            </ul>
          </div>
        </div>
      </SectionCard>

      <SectionCard title='Репозитории' description='2 основных репозитория'>
        <div className='space-y-2'>
          <div>
            <p className='font-medium'>leo (Frontend)</p>
            <p className='text-muted-foreground'>
              Next.js приложение — дашборд, админка, маркетинг,
              API-роуты, server actions, Prisma-схема.
            </p>
          </div>
          <div>
            <p className='font-medium'>ai-master (Backend AI)</p>
            <p className='text-muted-foreground'>
              3 микросервиса: leo-gateway, agent-orchestrator, agent-runtime.
              Docker Compose для деплоя.
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title='Ключевые фичи'>
        <ul className='list-disc pl-4 text-muted-foreground space-y-1'>
          <li>Создание AI-агентов через квиз-конструктор (5 ролей: продажник, лид-квалификатор, поддержка, консультант, корпоративный бот)</li>
          <li>База знаний: загрузка документов (PDF, DOCX, XLSX, CSV, TXT, MD, HTML, PPTX, изображения OCR), smart/semantic chunking, contextual enrichment</li>
          <li>Гибридный поиск: Chroma (вектора) + PostgreSQL FTS (полнотекст), RRF-объединение</li>
          <li>Настройка поведения: тон, температура, guardrails, расписание (7x24), праздники</li>
          <li>Notes (заметки) — приоритетнее базы знаний, для актуальных обновлений</li>
          <li>Conflict detection — автоматическое обнаружение противоречий в данных (report_conflict tool)</li>
          <li>Автотестирование: генерация вопросов по файлам, прогон, оценка</li>
          <li>Prompt versioning — история версий системных промптов</li>
          <li>PU-биллинг: подписки, overage, заморозка данных при неоплате</li>
          <li>Админка: дашборд, управление пользователями/агентами, биллинг-аналитика, глобальные промпты</li>
        </ul>
      </SectionCard>
    </div>
  )
}

function ArchitectureTab() {
  return (
    <div className='grid gap-4 md:grid-cols-2'>
      <SectionCard
        title='Общая архитектура'
        description='Микросервисная архитектура с 4 основными компонентами'
      >
        <CodeBlock>{`┌─────────────────────────────────────────────────┐
│  Next.js App (leo)         порт 3000           │
│  ├── Dashboard (React)                          │
│  ├── Admin Panel                                │
│  ├── API Routes (/api/...)                      │
│  ├── Server Actions (actions/...)               │
│  └── Prisma ORM → PostgreSQL                    │
└──────────────┬──────────────────────────────────┘
               │ HTTP (x-api-secret)
               ▼
┌──────────────────────────────────────────────────┐
│  leo-gateway                порт 8080            │
│  ├── /chat/completions → LiteLLM → Claude/GPT   │
│  ├── /documents/parse → smart/semantic chunking  │
│  ├── /documents/vectorize → ChromaDB + PG FTS    │
│  ├── /documents/search → hybrid search (RRF)     │
│  ├── /agents/:id/chat → тест-чат с агентом       │
│  ├── /conflicts → конфликты в знаниях            │
│  └── /llm-webhook ← LiteLLM callback            │
└──────────┬───────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────┐
│  agent-orchestrator         порт 8081            │
│  ├── CRUD агентов (прямой SQL)                   │
│  ├── Docker: start/stop контейнеров              │
│  ├── Behavior: тон, guardrails, температура      │
│  ├── Schedule: 7x24 расписание, праздники        │
│  ├── Notes: CRUD заметок + векторизация          │
│  └── Quiz Prompt: генерация промптов из квиза    │
└──────────┬───────────────────────────────────────┘
           │ Docker Socket
           ▼
┌──────────────────────────────────────────────────┐
│  agent-runtime (по 1 контейнеру на агента)       │
│  ├── grammY Telegram-бот                         │
│  ├── Debounce сообщений (5 сек по умолчанию)     │
│  ├── Memory Manager (summarization при >20 msg)  │
│  ├── RAG: поиск документов через gateway         │
│  ├── Schedule Checker (рабочие часы)             │
│  └── Tools: report_conflict                      │
└──────────────────────────────────────────────────┘

┌─── Инфраструктура ───┐
│  LiteLLM (порт 4000)  │  ← прокси к Claude/GPT/OpenRouter
│  ChromaDB (порт 8000) │  ← вектора для RAG
│  PostgreSQL (5432)     │  ← единая БД для всех сервисов
│  Traefik (80/443)     │  ← reverse proxy + SSL
└───────────────────────┘`}</CodeBlock>
      </SectionCard>

      <SectionCard title='Потоки данных'>
        <div className='space-y-3'>
          <div>
            <p className='font-medium'>Загрузка документов</p>
            <p className='text-muted-foreground text-xs'>
              1. Файл загружается в Next.js → 2. Отправляется в gateway /parse →
              3. Парсинг (mammoth/xlsx/pdf-parse/OCR) → 4. Smart-split (4000 символов, sentence-aware) или semantic-split (ONNX) →
              5. Vectorize: PU-тарификация, contextual enrichment (claude-sonnet-4-6), сохранение в ChromaDB + document_chunks →
              6. Статус VECTORIZED
            </p>
          </div>
          <div>
            <p className='font-medium'>Ответ агента (Telegram)</p>
            <p className='text-muted-foreground text-xs'>
              1. Пользователь пишет в Telegram → 2. grammY получает сообщение →
              3. Debounce (ждёт 5 сек) → 4. Проверка расписания →
              5. Сохранение в agent_messages → 6. Получение memory context (recent + summary) →
              7. Поиск документов (hybrid search: Chroma + FTS через RRF) →
              8. Сборка system prompt (platform_core + agent prompt + tone + guardrails + conflict protocol + schedule + RAG + notes) →
              9. LLM вызов через gateway → LiteLLM → Claude/GPT →
              10. Обработка tool calls (report_conflict) →
              11. Ответ пользователю → 12. Проверка summarization (при &gt;20 сообщений)
            </p>
          </div>
          <div>
            <p className='font-medium'>PU-биллинг</p>
            <p className='text-muted-foreground text-xs'>
              LLM-вызов → LiteLLM callback → /llm-webhook → подсчёт PU (1000 tokens = 1 PU) →
              atomic UPDATE user_subscriptions.pu_balance → лог в pu_transactions →
              проверка порогов (80%, 100%, overdraft, block)
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title='Сетевая топология (Docker)'>
        <CodeBlock>{`Сеть: leo_default (bridge, external)

Сервисы:
  db              PostgreSQL 16  (общая БД)
  litellm-db      PostgreSQL 16  (только для LiteLLM)
  litellm         LiteLLM proxy  :4000
  chroma          ChromaDB       :8000
  leo-gateway     Express.js     :8080
  agent-orchestrator  Express.js :8081
  leo-agent-*     agent-runtime  (динамические)
  traefik         Reverse proxy  :80/:443

Домены (prod):
  app.leoagent.ru       → Next.js
  gateway.leoagent.ru   → leo-gateway (через Traefik)
  orchestrator.leoagent.ru → orchestrator (через Traefik)`}</CodeBlock>
      </SectionCard>

      <SectionCard title='Безопасность'>
        <ul className='list-disc pl-4 text-muted-foreground space-y-1'>
          <li><strong>API авторизация</strong>: x-api-secret хедер для gateway и orchestrator (пропускается в dev)</li>
          <li><strong>Webhook</strong>: x-webhook-secret для LLM webhook (обязателен в prod)</li>
          <li><strong>Auth</strong>: NextAuth v5 с JWT, Google OAuth + credentials</li>
          <li><strong>RBAC</strong>: UserRole ADMIN/USER, проверка в layout и server actions</li>
          <li><strong>Сессии</strong>: JWT с отзывом через UserSession, tracking IP/UA</li>
          <li><strong>Email</strong>: 6-значный код верификации</li>
          <li><strong>Docker</strong>: контейнеры агентов в изолированной сети, unless-stopped</li>
        </ul>
      </SectionCard>
    </div>
  )
}

function GatewayTab() {
  return (
    <div className='grid gap-4'>
      <SectionCard
        title='leo-gateway'
        description='Express.js сервис: LLM-прокси, парсинг документов, векторизация, чат-API, биллинг'
      >
        <FileRef path='ai-master/services/leo-gateway/src/' desc='корень сервиса' />
        <FileRef path='src/index.ts' desc='Express app, middleware, маршруты' />
        <FileRef path='src/config.ts' desc='Zod-схема env: PORT, DATABASE_URL, LITELLM_URL, CHROMA_URL, OPENAI_API_KEY, EMBEDDING_MODEL, API_SECRET, WEBHOOK_SECRET' />
      </SectionCard>

      <SectionCard title='API Endpoints'>
        <div className='space-y-1'>
          <p className='font-medium text-xs text-muted-foreground mb-2'>Chat & LLM</p>
          <Endpoint method='POST' path='/api/v1/chat/completions' desc='Chat completion через LiteLLM с проверкой PU-баланса' />
          <Endpoint method='POST' path='/api/v1/llm-webhook' desc='Callback от LiteLLM: запись usage, списание PU' />
          <Endpoint method='POST' path='/api/v1/generate-persona' desc='Генерация persona промпта' />
          <Endpoint method='POST' path='/api/v1/generate-agent-prompt' desc='Генерация системного промпта агента' />

          <p className='font-medium text-xs text-muted-foreground mb-2 mt-4'>Documents</p>
          <Endpoint method='POST' path='/api/v1/documents/parse' desc='Парсинг файла → чанки (smart/semantic split)' />
          <Endpoint method='POST' path='/api/v1/documents/parse-semantic' desc='Semantic chunking через LLM' />
          <Endpoint method='POST' path='/api/v1/documents/vectorize' desc='Векторизация: PU-тариф, enrichment, Chroma + PG' />
          <Endpoint method='POST' path='/api/v1/documents/search' desc='Поиск документов (vector search)' />
          <Endpoint method='GET' path='/api/v1/documents/:agentId/info' desc='Инфо о базе знаний агента' />
          <Endpoint method='DELETE' path='/api/v1/documents/:agentId' desc='Удаление всей базы знаний агента' />
          <Endpoint method='POST' path='/api/v1/documents/delete-by-source' desc='Удаление документа по filename' />

          <p className='font-medium text-xs text-muted-foreground mb-2 mt-4'>Agent Documents & Chat</p>
          <Endpoint method='GET' path='/api/v1/agents/:id/documents' desc='Список документов агента' />
          <Endpoint method='DELETE' path='/api/v1/agents/:id/documents/:docId' desc='Удаление документа' />
          <Endpoint method='GET' path='/api/v1/agents/:id/documents/:docId' desc='Чанки документа' />
          <Endpoint method='PATCH' path='/api/v1/agents/:id/documents/:docId/chunks/:chunkId' desc='Редактирование чанка + re-enrich' />
          <Endpoint method='POST' path='/api/v1/agents/:id/chat' desc='Тест-чат с агентом (RAG + notes + tools)' />
          <Endpoint method='POST' path='/api/v1/agents/:id/chat/reset' desc='Сброс сессии чата' />
          <Endpoint method='GET' path='/api/v1/agents/:id/chat/history' desc='История сообщений сессии' />

          <p className='font-medium text-xs text-muted-foreground mb-2 mt-4'>System & Conflicts</p>
          <Endpoint method='GET' path='/api/v1/system-prompts/:slug' desc='Получение системного промпта (platform_core и т.д.)' />
          <Endpoint method='POST' path='/api/v1/system-prompts/refresh' desc='Сброс кеша промптов' />
          <Endpoint method='GET' path='/api/v1/agents/:id/prompt-preview' desc='Превью собранного промпта' />
          <Endpoint method='POST' path='/api/v1/conflicts' desc='Логирование конфликта' />
          <Endpoint method='GET' path='/api/v1/conflicts' desc='Список конфликтов агента' />
          <Endpoint method='PATCH' path='/api/v1/conflicts/:id' desc='Обновление статуса конфликта' />
          <Endpoint method='GET' path='/api/v1/usage/:userId' desc='Статистика использования' />
        </div>
      </SectionCard>

      <div className='grid gap-4 md:grid-cols-2'>
        <SectionCard title='Ключевые сервисы'>
          <div className='space-y-2'>
            <div>
              <p className='font-medium'>chat.service.ts</p>
              <p className='text-muted-foreground text-xs'>
                Полный цикл чата: config агента → memory → hybrid search (RAG) → notes injection →
                LLM call с tools → tool execution → ответ. Поддерживает сессии, summarization.
              </p>
            </div>
            <div>
              <p className='font-medium'>hybrid-search.service.ts</p>
              <p className='text-muted-foreground text-xs'>
                Объединяет Chroma (vector) и PostgreSQL FTS через Reciprocal Rank Fusion (k=60).
                Fallback на vector-only если FTS недоступен.
              </p>
            </div>
            <div>
              <p className='font-medium'>contextual-retrieval.service.ts</p>
              <p className='text-muted-foreground text-xs'>
                Обогащение чанков контекстом через claude-sonnet-4-6. Детекция конфликтов по маркерам
                (противоречит, обновляет, заменяет). Формат: [CONTEXT]: контекст\n\nоригинал.
              </p>
            </div>
            <div>
              <p className='font-medium'>pu-charging.service.ts</p>
              <p className='text-muted-foreground text-xs'>
                Smart-тарификация файлов: SHA-256 для дупликатов (0%), полная цена для новых.
                Atomic UPDATE с RETURNING для безопасного списания PU.
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title='Chunking Pipeline'>
          <div className='space-y-2'>
            <div>
              <p className='font-medium'>parser.service.ts</p>
              <p className='text-muted-foreground text-xs'>
                Поддержка 15+ форматов: PDF (pdf-parse), DOCX (mammoth), XLSX/CSV (xlsx),
                PPTX (office-text-extractor), изображения (Tesseract.js OCR), HTML, JSON, Markdown, TXT.
              </p>
            </div>
            <div>
              <p className='font-medium'>smart-splitter.ts</p>
              <p className='text-muted-foreground text-xs'>
                Многоуровневый сплит: 1) по семантическим разделителям (###, ##, [QUESTION], --- и т.д.) →
                2) мержинг мелких блоков → 3) split по предложениям с overlap.
                Дефолт: maxChunkSize=4000, minChunkSize=500.
              </p>
            </div>
            <div>
              <p className='font-medium'>semantic-splitter.ts</p>
              <p className='text-muted-foreground text-xs'>
                ONNX-based: Xenova/all-MiniLM-L6-v2 (локально, без API).
                Similarity threshold = 0.5, maxTokenSize = 500.
              </p>
            </div>
            <div>
              <p className='font-medium'>sentence-tokenizer.ts</p>
              <p className='text-muted-foreground text-xs'>
                Разбивка на предложения с обработкой аббревиатур (30+ рус, 20+ англ).
              </p>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}

function OrchestratorTab() {
  return (
    <div className='grid gap-4'>
      <SectionCard
        title='agent-orchestrator'
        description='Express.js сервис: CRUD агентов, Docker-управление, настройки поведения'
      >
        <FileRef path='ai-master/services/agent-orchestrator/src/' desc='корень сервиса' />
        <FileRef path='src/config.ts' desc='Zod: PORT, DATABASE_URL, GATEWAY_URL, AGENT_IMAGE, DOCKER_NETWORK, API_SECRET' />
      </SectionCard>

      <SectionCard title='API Endpoints'>
        <div className='space-y-1'>
          <p className='font-medium text-xs text-muted-foreground mb-2'>Agents CRUD</p>
          <Endpoint method='GET' path='/api/v1/agents' desc='Список агентов пользователя (query: userId)' />
          <Endpoint method='GET' path='/api/v1/agents/:id' desc='Детали агента + live Docker status' />
          <Endpoint method='POST' path='/api/v1/agents' desc='Создание агента' />
          <Endpoint method='PATCH' path='/api/v1/agents/:id' desc='Обновление агента' />
          <Endpoint method='DELETE' path='/api/v1/agents/:id' desc='Удаление: stop container + delete Chroma + DB cascade' />

          <p className='font-medium text-xs text-muted-foreground mb-2 mt-4'>Container Management</p>
          <Endpoint method='POST' path='/api/v1/agents/:id/start' desc='Запуск контейнера (передаёт behavior в env)' />
          <Endpoint method='POST' path='/api/v1/agents/:id/stop' desc='Остановка контейнера' />
          <Endpoint method='GET' path='/api/v1/agents/:id/status' desc='Live статус + sync с Docker' />
          <Endpoint method='GET' path='/api/v1/agents/:id/logs' desc='Логи контейнера (tail)' />

          <p className='font-medium text-xs text-muted-foreground mb-2 mt-4'>Behavior & Prompts</p>
          <Endpoint method='GET' path='/api/v1/agents/:id/behavior' desc='Настройки: displayName, temperature, tone, guardrails' />
          <Endpoint method='PATCH' path='/api/v1/agents/:id/behavior' desc='Обновление настроек' />
          <Endpoint method='GET' path='/api/v1/agents/:id/prompts' desc='Версии промптов' />
          <Endpoint method='POST' path='/api/v1/agents/:id/prompts' desc='Создание новой версии (auto-activate)' />
          <Endpoint method='PUT' path='/api/v1/agents/:id/prompts/:vId/activate' desc='Активация версии' />
          <Endpoint method='PATCH' path='/api/v1/agents/:id/prompts/:vId' desc='Редактирование версии' />

          <p className='font-medium text-xs text-muted-foreground mb-2 mt-4'>Schedule & Notes</p>
          <Endpoint method='GET' path='/api/v1/agents/:id/schedule' desc='Расписание: 7x24 grid + holidays + offline msg' />
          <Endpoint method='PATCH' path='/api/v1/agents/:id/schedule' desc='Обновление расписания' />
          <Endpoint method='GET' path='/api/v1/agents/:id/notes' desc='Заметки агента' />
          <Endpoint method='POST' path='/api/v1/agents/:id/notes' desc='Создание заметки + векторизация' />
          <Endpoint method='PATCH' path='/api/v1/agents/:id/notes/:nId' desc='Редактирование заметки' />
          <Endpoint method='DELETE' path='/api/v1/agents/:id/notes/:nId' desc='Удаление заметки + Chroma cleanup' />

          <p className='font-medium text-xs text-muted-foreground mb-2 mt-4'>Quiz & Stats</p>
          <Endpoint method='POST' path='/api/v1/generate-agent-prompt-from-quiz' desc='Генерация промпта из ответов квиза' />
          <Endpoint method='GET' path='/api/v1/agents/:id/stats' desc='Статистика: диалоги, токены, response time' />
          <Endpoint method='GET' path='/api/v1/agents/:id/stats/period' desc='Статистика по периоду' />
          <Endpoint method='GET' path='/api/v1/agents/user/:userId/stats' desc='Общая статистика пользователя' />
          <Endpoint method='GET' path='/api/v1/agents/user/:userId/stats/history' desc='История 24h/7d/30d' />
        </div>
      </SectionCard>

      <div className='grid gap-4 md:grid-cols-2'>
        <SectionCard title='Docker Service'>
          <p className='text-muted-foreground'>
            Управляет контейнерами через Docker Socket (/var/run/docker.sock).
          </p>
          <ul className='list-disc pl-4 text-muted-foreground text-xs space-y-1 mt-2'>
            <li>Image: <code>leo-agent-runtime:latest</code></li>
            <li>Network: <code>leo_default</code></li>
            <li>Naming: <code>leo-agent-&#123;agentId&#125;</code></li>
            <li>Labels: <code>leo.agent.id</code>, <code>leo.user.id</code>, <code>leo.managed</code></li>
            <li>RestartPolicy: unless-stopped</li>
            <li>TZ: Europe/Moscow</li>
            <li>При start — удаляет старый контейнер, создаёт новый (fresh env vars)</li>
            <li>Передаёт behavior через env: DISPLAY_NAME, TEMPERATURE, TONE, GUARDRAILS, IDENTITY_INSTRUCTION</li>
          </ul>
        </SectionCard>

        <SectionCard title='Quiz Prompt Service'>
          <p className='text-muted-foreground'>
            Генерирует системный промпт из ответов квиза. 5 ролей:
          </p>
          <ul className='list-disc pl-4 text-muted-foreground text-xs space-y-1 mt-2'>
            <li><strong>sales</strong> — CTA (встреча/оплата/телефон), стиль продаж (агрессивный/консультативный/пассивный)</li>
            <li><strong>lead_qualification</strong> — фильтр лидов (пылесос/снайпер), стратегия сбора (нативно/анкета)</li>
            <li><strong>support</strong> — уровень эмпатии, технический язык (новичок/эксперт)</li>
            <li><strong>info_consultant</strong> — интерпретация (строго/аналитик), реакция на оффтопик</li>
            <li><strong>corporate_bot</strong> — аудитория, строгость, цитирование, конфликты, глубина ответов</li>
          </ul>
          <p className='text-muted-foreground text-xs mt-2'>
            + глобальные настройки: тон, длина ответов, fallback-стратегия, ограничения, few-shot примеры.
            Мета-промпт берётся из DB (quiz_meta_architect) или fallback.
          </p>
        </SectionCard>
      </div>
    </div>
  )
}

function RuntimeTab() {
  return (
    <div className='grid gap-4 md:grid-cols-2'>
      <SectionCard
        title='agent-runtime'
        description='Telegram-бот: grammY, LLM-клиент, память, расписание, tools'
      >
        <FileRef path='ai-master/services/agent-runtime/src/' desc='корень сервиса' />
        <p className='text-muted-foreground'>
          Каждый агент — отдельный Docker-контейнер с этим кодом. При запуске получает config через env vars.
        </p>
        <div className='mt-2'>
          <p className='font-medium text-xs'>Env Variables:</p>
          <p className='text-muted-foreground text-xs'>
            AGENT_ID, USER_ID, AGENT_NAME, SYSTEM_PROMPT, TELEGRAM_BOT_TOKEN,
            GATEWAY_URL, DATABASE_URL, DISPLAY_NAME, TEMPERATURE, DEBOUNCE_MS,
            WELCOME_MESSAGE, TONE (JSON), GUARDRAILS (JSON), IDENTITY_INSTRUCTION,
            MAX_MESSAGES (20), KEEP_MESSAGES (10), LANGCHAIN_* (tracing)
          </p>
        </div>
      </SectionCard>

      <SectionCard title='Telegram Bot (bot.ts)'>
        <p className='text-muted-foreground'>
          grammY бот с debounce-логикой. Ожидает DEBOUNCE_MS (по умолчанию 5 сек) после последнего
          сообщения пользователя, затем объединяет все сообщения в один запрос.
        </p>
        <div className='mt-2'>
          <p className='font-medium text-xs'>Команды:</p>
          <ul className='list-disc pl-4 text-muted-foreground text-xs'>
            <li>/start — приветствие (custom welcomeMessage или дефолт)</li>
            <li>/help — справка</li>
            <li>/clear — очистка истории</li>
          </ul>
        </div>
        <div className='mt-2'>
          <p className='font-medium text-xs'>Цикл обработки:</p>
          <p className='text-muted-foreground text-xs'>
            checkSchedule → saveMessage → getMemoryContext → searchDocuments (RAG) →
            buildFullSystemPrompt (platform_core + agent + tone + guardrails + conflict_protocol + schedule) →
            buildMessages → LLM chat (с tools) → saveMessage → reply (Markdown → fallback plain text)
          </p>
        </div>
      </SectionCard>

      <SectionCard title='Memory Manager'>
        <p className='text-muted-foreground'>
          Управление историей диалога. Хранит сообщения в agent_messages, суммаризирует при переполнении.
        </p>
        <ul className='list-disc pl-4 text-muted-foreground text-xs space-y-1 mt-2'>
          <li>MAX_MESSAGES = 20 — порог суммаризации</li>
          <li>KEEP_MESSAGES = 10 — сколько оставить после суммаризации</li>
          <li>Суммаризация через Claude (summarization_template промпт)</li>
          <li>Результат в agent_summaries, старые сообщения удаляются</li>
          <li>clearHistory — полная очистка (messages + summaries)</li>
        </ul>
      </SectionCard>

      <SectionCard title='LLM Client & Tools'>
        <p className='text-muted-foreground'>
          Axios-клиент к gateway /chat/completions. Поддерживает tool calls.
        </p>
        <div className='mt-2'>
          <p className='font-medium text-xs'>report_conflict tool:</p>
          <p className='text-muted-foreground text-xs'>
            Обнаружение противоречий в базе знаний. Параметры: topic, conflicting_files
            (file_id, file_name, value_found). Отправляет POST /conflicts на gateway.
          </p>
        </div>
        <div className='mt-2'>
          <p className='font-medium text-xs'>Schedule Checker:</p>
          <p className='text-muted-foreground text-xs'>
            Проверяет work_schedule (7x24 bool grid) и holidays (DD.MM.YYYY).
            Если нерабочее время — отправляет offline_message и НЕ вызывает LLM.
            Генерирует текстовое описание расписания для system prompt.
          </p>
        </div>
      </SectionCard>
    </div>
  )
}

function FrontendTab() {
  return (
    <div className='grid gap-4'>
      <SectionCard title='Страницы приложения'>
        <div className='grid md:grid-cols-3 gap-4'>
          <div>
            <p className='font-medium text-xs mb-2'>Marketing</p>
            <div className='space-y-0.5 text-xs text-muted-foreground'>
              <p><code>/</code> — Landing page</p>
              <p><code>/pricing</code> → redirect /dashboard/billing</p>
              <p><code>/blog</code> — Blog listing</p>
              <p><code>/blog/[slug]</code> — Blog post</p>
              <p><code>/docs</code> — Documentation</p>
              <p><code>/guides</code> — Guides</p>
            </div>
          </div>
          <div>
            <p className='font-medium text-xs mb-2'>Dashboard</p>
            <div className='space-y-0.5 text-xs text-muted-foreground'>
              <p><code>/dashboard</code> — Overview</p>
              <p><code>/dashboard/agents</code> — Список агентов</p>
              <p><code>/dashboard/agents/[id]</code> — Агент (sub-pages: behavior, settings, test, knowledge, sources, conflicts)</p>
              <p><code>/dashboard/knowledge</code> — Библиотека</p>
              <p><code>/dashboard/billing</code> — Биллинг + подписка</p>
              <p><code>/dashboard/settings</code> — Настройки</p>
              <p><code>/dashboard/inbox</code> — Уведомления</p>
              <p><code>/dashboard/charts</code> — Аналитика</p>
            </div>
          </div>
          <div>
            <p className='font-medium text-xs mb-2'>Admin</p>
            <div className='space-y-0.5 text-xs text-muted-foreground'>
              <p><code>/admin</code> — Dashboard (KPIs)</p>
              <p><code>/admin/users</code> — Пользователи</p>
              <p><code>/admin/users/[id]</code> — Детали</p>
              <p><code>/admin/agents</code> — Агенты</p>
              <p><code>/admin/billing</code> — Биллинг-аналитика</p>
              <p><code>/admin/subscriptions</code> — Подписки</p>
              <p><code>/admin/model-costs</code> — Тарифы моделей</p>
              <p><code>/admin/token-rates</code> — Курсы</p>
              <p><code>/admin/prompts</code> — Глобальные промпты</p>
              <p><code>/admin/system-logs</code> — Логи</p>
              <p><code>/admin/project-docs</code> — Эта страница</p>
            </div>
          </div>
        </div>
      </SectionCard>

      <div className='grid gap-4 md:grid-cols-2'>
        <SectionCard title='Ключевые Server Actions'>
          <div className='space-y-2 text-xs'>
            <div>
              <p className='font-medium'>actions/agent-knowledge.ts</p>
              <p className='text-muted-foreground'>Управление базой знаний: загрузка файлов → parse → vectorize, удаление, список документов</p>
            </div>
            <div>
              <p className='font-medium'>actions/library.ts</p>
              <p className='text-muted-foreground'>Библиотека пользователя: загрузка файлов/заметок, парсинг через gateway, fallback на простой split</p>
            </div>
            <div>
              <p className='font-medium'>actions/admin-dashboard.ts</p>
              <p className='text-muted-foreground'>getDashboardStats, getDashboardCharts, getActivityFeed</p>
            </div>
            <div>
              <p className='font-medium'>actions/admin-users.ts</p>
              <p className='text-muted-foreground'>getAdminUsers, getAdminUserDetail, adjustPuBalance, setUserBlocked</p>
            </div>
            <div>
              <p className='font-medium'>actions/admin-agents.ts</p>
              <p className='text-muted-foreground'>getAdminAgents, getAdminAgentDetail, getAgentDialog</p>
            </div>
            <div>
              <p className='font-medium'>actions/admin-billing.ts</p>
              <p className='text-muted-foreground'>getBillingPuStats, getPuTransactions, getUsdStats, getFilesStats</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title='Ключевые библиотеки (lib/)'>
          <div className='space-y-2 text-xs'>
            <div>
              <p className='font-medium'>lib/pu-balance.ts</p>
              <p className='text-muted-foreground'>getPuBalance, checkPuAvailable (soft limit -5.0), deductPu (atomic), addPuBalance</p>
            </div>
            <div>
              <p className='font-medium'>lib/subscription-manager.ts</p>
              <p className='text-muted-foreground'>resetSubscriptionCycle, dailyCycleResetJob, freezeUserData, unfreezeUserData, dailyCleanupFrozenDataJob</p>
            </div>
            <div>
              <p className='font-medium'>lib/token-tracking.ts</p>
              <p className='text-muted-foreground'>getModelCost, calculateRealCost, trackTokenUsage, getUserTokenStats</p>
            </div>
            <div>
              <p className='font-medium'>lib/file-charging.ts</p>
              <p className='text-muted-foreground'>calculateFileCharge (Jaccard similarity), saveFileProcessingCache</p>
            </div>
            <div>
              <p className='font-medium'>lib/ai-fetch.ts</p>
              <p className='text-muted-foreground'>aiFetch — authenticated HTTP к gateway/orchestrator (x-api-secret)</p>
            </div>
            <div>
              <p className='font-medium'>lib/pu-notifications.ts</p>
              <p className='text-muted-foreground'>Пороги: 80% warning, 100% limit, overdraft, service blocked</p>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard title='API Routes (app/api/)'>
        <div className='grid md:grid-cols-3 gap-4 text-xs'>
          <div>
            <p className='font-medium mb-1'>Auth</p>
            <p className='text-muted-foreground'>
              /api/auth/[...nextauth], /api/auth/register, /api/auth/verify-code, /api/auth/resend-code
            </p>
            <p className='font-medium mb-1 mt-2'>User</p>
            <p className='text-muted-foreground'>
              /api/user (GET/PATCH), /api/user/profile, /api/user/password, /api/user/sessions
            </p>
          </div>
          <div>
            <p className='font-medium mb-1'>Agents</p>
            <p className='text-muted-foreground'>
              /api/agents (CRUD), /api/agents/[id]/behavior, /api/agents/[id]/stats,
              /api/v1/agents/[id]/kb/*, /api/v1/agents/[id]/testing/*
            </p>
            <p className='font-medium mb-1 mt-2'>AI</p>
            <p className='text-muted-foreground'>
              /api/ai/generate-agent-prompt, /api/ai/generate-metadata
            </p>
          </div>
          <div>
            <p className='font-medium mb-1'>Payments</p>
            <p className='text-muted-foreground'>
              /api/tochka/init, /api/tochka/webhook, /api/ypmn/init, /api/ypmn/webhook
            </p>
            <p className='font-medium mb-1 mt-2'>Cron Jobs</p>
            <p className='text-muted-foreground'>
              /api/cron/cycle-reset, /api/cron/cleanup-frozen, /api/cron/send-notifications
            </p>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}

function DatabaseTab() {
  return (
    <div className='grid gap-4'>
      <SectionCard title='Prisma Models' description='Единая PostgreSQL база для всех сервисов'>
        <div className='grid md:grid-cols-3 gap-4 text-xs'>
          <div>
            <p className='font-medium mb-1'>Auth & Users</p>
            <ul className='list-disc pl-4 text-muted-foreground space-y-0.5'>
              <li><strong>User</strong> — id, email, name, role (ADMIN/USER), tokenBalance, stripe fields</li>
              <li><strong>Account</strong> — OAuth провайдеры (Google)</li>
              <li><strong>Session</strong> — NextAuth сессии</li>
              <li><strong>UserSession</strong> — JWT tracking (jti, isRevoked)</li>
              <li><strong>VerificationToken</strong> — email verification</li>
              <li><strong>EmailVerificationCode</strong> — 6-digit codes</li>
            </ul>
          </div>
          <div>
            <p className='font-medium mb-1'>Agents</p>
            <ul className='list-disc pl-4 text-muted-foreground space-y-0.5'>
              <li><strong>Agent</strong> — id, userId, name, role, systemPrompt, telegramToken, status, behavior (displayName, temperature, tone[], guardrails JSON), schedule (workSchedule JSON, holidays[], offlineMessage)</li>
              <li><strong>AgentMessage</strong> — agentId, telegramUserId, messageType (HUMAN/AI/TOOL/SYSTEM), isTest</li>
              <li><strong>AgentSummary</strong> — суммаризации диалогов</li>
              <li><strong>AgentNote</strong> — заметки с vectorId</li>
              <li><strong>SystemPromptVersion</strong> — версии промптов (version, content, isActive)</li>
            </ul>
          </div>
          <div>
            <p className='font-medium mb-1'>Knowledge Base</p>
            <ul className='list-disc pl-4 text-muted-foreground space-y-0.5'>
              <li><strong>KnowledgeBase</strong> — agentId, filename, status (PENDING/PARSED/VECTORIZED/ERROR), aiMetadata</li>
              <li><strong>DocumentChunk</strong> — content, context (enrichment), chunkIndex, searchVector (tsvector)</li>
              <li><strong>LibraryItem</strong> — userId, name, type (FILE/NOTE), status</li>
              <li><strong>LibraryChunk</strong> — libraryItemId, content, chunkIndex</li>
              <li><strong>KnowledgeConflict</strong> — topic, details JSON, status (NEW/RESOLVED/IGNORED)</li>
            </ul>
          </div>
        </div>
      </SectionCard>

      <SectionCard title='Billing Models'>
        <div className='grid md:grid-cols-2 gap-4 text-xs'>
          <div>
            <p className='font-medium mb-1'>Token System (legacy)</p>
            <ul className='list-disc pl-4 text-muted-foreground space-y-0.5'>
              <li><strong>TokenUsage</strong> — userId, model, promptTokens, completionTokens, totalTokens, responseTimeMs, requestType (8 enum values), platformTokensCharged, realCostUsd, isTest</li>
              <li><strong>TokenRateConfig</strong> — rubToTokenRate, llmTokenToTokenRate</li>
              <li><strong>ModelCostConfig</strong> — modelName, inputCostPerMillion, outputCostPerMillion</li>
              <li><strong>TokenTransaction</strong> — type (TOPUP/DEDUCTION/ADJUSTMENT/REFUND), amount, balanceBefore/After</li>
            </ul>
          </div>
          <div>
            <p className='font-medium mb-1'>PU Subscription System (active)</p>
            <ul className='list-disc pl-4 text-muted-foreground space-y-0.5'>
              <li><strong>SubscriptionPlan</strong> — code (BASIC/PRO/BUSINESS/ENTERPRISE), monthlyPuLimit, priceMonthlyRub, overagePuPriceRub</li>
              <li><strong>UserSubscription</strong> — userId, planId, puBalance, puLimit, billingCycle dates, puUsedThisCycle, overagePuUsed, isOverdraft, isBlocked, status (ACTIVE/PAST_DUE/CANCELED/SUSPENDED/FROZEN)</li>
              <li><strong>PuTransaction</strong> — type (6 enum values), puAmount, balanceBefore/After, source, billingCycleDate, costRub</li>
              <li><strong>PuNotification</strong> — type (4 thresholds), puBalance, puLimit, usagePercent, wasSent, channel</li>
            </ul>
          </div>
        </div>
      </SectionCard>

      <SectionCard title='Testing & Cache Models'>
        <div className='grid md:grid-cols-2 gap-4 text-xs'>
          <div>
            <p className='font-medium mb-1'>Auto-Testing</p>
            <ul className='list-disc pl-4 text-muted-foreground space-y-0.5'>
              <li><strong>AgentTestCase</strong> — question, expectedAnswer</li>
              <li><strong>ChatTestHistory</strong> — messages JSON, messageCount</li>
              <li><strong>FileQaQuestion</strong> — auto-generated QA из файлов</li>
              <li><strong>AutoTestRun</strong> — status, score</li>
              <li><strong>AutoTestRunResult</strong> — actualAnswer, passed, matchPercentage</li>
            </ul>
          </div>
          <div>
            <p className='font-medium mb-1'>Cache & Freeze</p>
            <ul className='list-disc pl-4 text-muted-foreground space-y-0.5'>
              <li><strong>FileProcessingCache</strong> — contentHash (SHA-256), chunkCount, puCharged, chargePercentage, previousVersion</li>
              <li><strong>FrozenData</strong> — resourceType, resourceId, planCodeRequired, puSizeEstimate, deleteScheduledAt (frozenAt + 30d)</li>
              <li><strong>GlobalSystemPrompt</strong> — key (unique), name, content, usedIn, isActive</li>
            </ul>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}

function BillingTab() {
  return (
    <div className='grid gap-4 md:grid-cols-2'>
      <SectionCard title='PU System' description='Processing Units — основная валюта платформы'>
        <div className='space-y-2'>
          <div>
            <p className='font-medium text-xs'>Конвертация</p>
            <p className='text-muted-foreground text-xs'>1 PU = 1000 LLM токенов. Векторизация: 1.5x множитель.</p>
          </div>
          <div>
            <p className='font-medium text-xs'>Списание за LLM</p>
            <p className='text-muted-foreground text-xs'>
              LiteLLM → callback → /llm-webhook → расчёт PU → atomic UPDATE user_subscriptions.pu_balance →
              лог в pu_transactions
            </p>
          </div>
          <div>
            <p className='font-medium text-xs'>Списание за файлы</p>
            <p className='text-muted-foreground text-xs'>
              При vectorize: SHA-256 hash → дупликат (0%) или новый файл (100%).
              Frontend: Jaccard similarity для частичных обновлений (20%/70%/100%).
            </p>
          </div>
          <div>
            <p className='font-medium text-xs'>Soft limit</p>
            <p className='text-muted-foreground text-xs'>
              Баланс может уходить до -5.0 PU (overdraft). Ниже — блокировка (isBlocked=true).
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title='Подписки'>
        <div className='space-y-2'>
          <div>
            <p className='font-medium text-xs'>Планы</p>
            <p className='text-muted-foreground text-xs'>
              BASIC / PRO / BUSINESS / ENTERPRISE. Каждый: monthlyPuLimit, priceMonthlyRub,
              overagePuPriceRub, overageDialogPriceRub, features JSON.
            </p>
          </div>
          <div>
            <p className='font-medium text-xs'>Жизненный цикл</p>
            <p className='text-muted-foreground text-xs'>
              1. Активация → ACTIVE + начисление PU (SUBSCRIPTION_GRANT)<br/>
              2. Ежемесячный reset (cron): сжигание остатка (RESET) + новое начисление<br/>
              3. Неоплата → PAST_DUE → CANCELED → freeze данных (30 дней)<br/>
              4. Заморозка: агенты остановлены, KB недоступна, 30 дней до удаления<br/>
              5. Оплата → unfreezeUserData → ACTIVE
            </p>
          </div>
          <div>
            <p className='font-medium text-xs'>Уведомления</p>
            <p className='text-muted-foreground text-xs'>
              Пороги: 80% использования, 100% лимит, overdraft (0 to -5), блокировка (&lt;-5).
              Одно уведомление на тип за биллинг-цикл.
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title='Оплата'>
        <div className='space-y-2'>
          <div>
            <p className='font-medium text-xs'>Tochka Bank</p>
            <p className='text-muted-foreground text-xs'>
              /api/tochka/init — создание подписки, /api/tochka/webhook — подтверждение оплаты.
              tochkaOperationId в UserSubscription.
            </p>
          </div>
          <div>
            <p className='font-medium text-xs'>YooMoney (YPMN)</p>
            <p className='text-muted-foreground text-xs'>
              /api/ypmn/init — инициализация, /api/ypmn/webhook — подтверждение.
            </p>
          </div>
          <div>
            <p className='font-medium text-xs'>Stripe (legacy, удалён из кода)</p>
            <p className='text-muted-foreground text-xs'>
              Поля в Prisma сохранены (stripeCustomerId и т.д.) для обратной совместимости БД.
              Весь код Stripe удалён.
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title='Cron Jobs'>
        <div className='space-y-2 text-xs'>
          <div>
            <p className='font-medium'>/api/cron/cycle-reset</p>
            <p className='text-muted-foreground'>Ежедневно: сброс PU-баланса для подписок с истекшим nextResetDate</p>
          </div>
          <div>
            <p className='font-medium'>/api/cron/cleanup-frozen</p>
            <p className='text-muted-foreground'>Ежедневно: удаление замороженных данных старше 30 дней</p>
          </div>
          <div>
            <p className='font-medium'>/api/cron/send-notifications</p>
            <p className='text-muted-foreground'>Отправка накопленных PU-уведомлений (email/in-app)</p>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}

function InfraTab() {
  return (
    <div className='grid gap-4 md:grid-cols-2'>
      <SectionCard title='Docker Compose (prod)' description='docker-compose.prod.yml'>
        <div className='space-y-2 text-xs'>
          <div>
            <p className='font-medium'>litellm-db</p>
            <p className='text-muted-foreground'>PostgreSQL 16 Alpine — отдельная БД для LiteLLM</p>
          </div>
          <div>
            <p className='font-medium'>litellm</p>
            <p className='text-muted-foreground'>
              ghcr.io/berriai/litellm:main-latest — LLM proxy с UI.
              Callbacks: LangSmith + postgres_usage_logger.
              Fallbacks: claude-sonnet-4-6 → claude-opus-4-6 → claude-sonnet-4-5 → gemini-3.1-pro-preview → gemini-2.5-pro.
            </p>
          </div>
          <div>
            <p className='font-medium'>chroma</p>
            <p className='text-muted-foreground'>chromadb/chroma:latest — векторная БД, порт 8000 (localhost only в prod)</p>
          </div>
          <div>
            <p className='font-medium'>leo-gateway</p>
            <p className='text-muted-foreground'>Build from Dockerfile. Traefik: gateway.leoagent.ru</p>
          </div>
          <div>
            <p className='font-medium'>agent-orchestrator</p>
            <p className='text-muted-foreground'>Build from Dockerfile. Docker socket mount. Traefik: orchestrator.leoagent.ru</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title='LiteLLM Config' description='litellm_config.yaml'>
        <div className='space-y-1 text-xs'>
          <p className='font-medium'>Модели:</p>
          <ul className='list-disc pl-4 text-muted-foreground space-y-0.5'>
            <li>Claude 4.6: claude-sonnet-4-6</li>
            <li>Claude 4.5: claude-opus-4-5, claude-sonnet-4-5, claude-haiku-4-5</li>
            <li>Claude 4: claude-opus-4, claude-sonnet-4</li>
            <li>Claude 3.5: claude-3-5-sonnet, claude-3-5-haiku</li>
            <li>Gemini: gemini-3.1-pro-preview, gemini-2.5-pro</li>
            <li>Embeddings: text-embedding-3-small (OpenAI)</li>
          </ul>
          <p className='font-medium mt-2'>Настройки:</p>
          <ul className='list-disc pl-4 text-muted-foreground space-y-0.5'>
            <li>Routing: simple-shuffle, 3 retries, 120s timeout</li>
            <li>Fallbacks: claude-sonnet-4-6 → claude-opus-4-6 → claude-sonnet-4-5 → gemini-3.1-pro-preview → gemini-2.5-pro</li>
            <li>Callbacks: langsmith + custom postgres_usage_logger</li>
            <li>drop_params: true (совместимость между провайдерами)</li>
          </ul>
        </div>
      </SectionCard>

      <SectionCard title='Системные промпты (DB)' description='global_system_prompts table'>
        <div className='space-y-2 text-xs'>
          <div>
            <p className='font-medium'>platform_core</p>
            <p className='text-muted-foreground'>
              Основные правила: формат ответов (HTML, не Markdown), приоритеты информации
              (Notes &gt; KB &gt; Agent &gt; General), работа с базой знаний, мультитопики,
              защита от манипуляций. ~600 слов.
            </p>
          </div>
          <div>
            <p className='font-medium'>conflict_detection_protocol</p>
            <p className='text-muted-foreground'>
              Протокол обнаружения конфликтов: не угадывать → вызвать report_conflict →
              сообщить клиенту → при срочности использовать Notes.
            </p>
          </div>
          <div>
            <p className='font-medium'>summarization_template</p>
            <p className='text-muted-foreground'>
              Шаблон суммаризации: max 150 слов, сохранить имя/данные/этап/вопросы,
              без служебных ID и общих фраз.
            </p>
          </div>
          <div>
            <p className='font-medium'>quiz_meta_architect</p>
            <p className='text-muted-foreground'>
              Мета-промпт для генерации системных промптов из квиза.
              Правила: max 500 слов, конкретные действия, без XML/emoji.
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title='Environment Variables'>
        <div className='space-y-2 text-xs'>
          <div>
            <p className='font-medium'>Next.js (.env)</p>
            <p className='text-muted-foreground'>
              NEXT_PUBLIC_APP_URL, DATABASE_URL, AUTH_SECRET, NEXTAUTH_URL,
              GOOGLE_CLIENT_ID/SECRET, RESEND_API_KEY, EMAIL_FROM,
              NEXT_PUBLIC_AGENT_ORCHESTRATOR_URL, NEXT_PUBLIC_AI_GATEWAY_URL,
              AI_GATEWAY_URL, AGENT_ORCHESTRATOR_URL,
              APIFY_API_TOKEN, TOCHKA_CLIENT_ID, TOCHKA_CLIENT_TOKEN
            </p>
          </div>
          <div>
            <p className='font-medium'>ai-master (.env)</p>
            <p className='text-muted-foreground'>
              DATABASE_URL, OPENAI_API_KEY, ANTHROPIC_API_KEY, OPENROUTER_KEY,
              LITELLM_MASTER_KEY, EMBEDDING_MODEL, DEFAULT_LLM_MODEL,
              API_SECRET, WEBHOOK_SECRET,
              LANGSMITH_API_KEY, LANGSMITH_PROJECT
            </p>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}

// ============================
// MAIN PAGE
// ============================

export default function ProjectDocsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  const tabContent: Record<TabId, React.ReactNode> = {
    overview: <OverviewTab />,
    architecture: <ArchitectureTab />,
    gateway: <GatewayTab />,
    orchestrator: <OrchestratorTab />,
    runtime: <RuntimeTab />,
    frontend: <FrontendTab />,
    database: <DatabaseTab />,
    billing: <BillingTab />,
    infra: <InfraTab />,
  }

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-bold'>Документация проекта</h1>
        <p className='text-sm text-muted-foreground'>
          Полное описание архитектуры, сервисов, API и моделей данных LEO
        </p>
      </div>

      <nav className='flex flex-wrap gap-1.5 border-b border-border pb-4'>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {tabContent[activeTab]}
    </div>
  )
}
