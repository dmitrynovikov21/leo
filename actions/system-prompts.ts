"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export type GlobalSystemPromptData = {
    id: string
    key: string
    name: string
    description: string | null
    usedIn: string | null
    content: string
    isActive: boolean
    createdAt: Date
    updatedAt: Date
}

// Get all system prompts
export async function getSystemPrompts(): Promise<GlobalSystemPromptData[]> {
    try {
        const user = await getCurrentUser()
        if (!user || user.role !== "ADMIN") {
            console.error("getSystemPrompts: user not admin", { userId: user?.id, role: user?.role })
            throw new Error("Unauthorized")
        }

        const prompts = await prisma.globalSystemPrompt.findMany({
            orderBy: { key: "asc" }
        })

        return prompts
    } catch (error) {
        console.error("getSystemPrompts error:", error)
        throw error
    }
}

// Get a single prompt by key
export async function getSystemPromptByKey(key: string): Promise<GlobalSystemPromptData | null> {
    const prompt = await prisma.globalSystemPrompt.findUnique({
        where: { key }
    })

    return prompt
}

// Get active prompt content by key (for use in code)
export async function getActivePromptContent(key: string): Promise<string | null> {
    const prompt = await prisma.globalSystemPrompt.findUnique({
        where: { key }
    })

    if (!prompt || !prompt.isActive) return null
    return prompt.content
}

// Create a new system prompt
export async function createSystemPrompt(data: {
    key: string
    name: string
    description?: string
    content: string
}): Promise<{ success: boolean; error?: string; prompt?: GlobalSystemPromptData }> {
    const user = await getCurrentUser()
    if (!user || user.role !== "ADMIN") {
        return { success: false, error: "Unauthorized" }
    }

    try {
        // Check if key already exists
        const existing = await prisma.globalSystemPrompt.findUnique({
            where: { key: data.key }
        })

        if (existing) {
            return { success: false, error: "Промпт с таким ключом уже существует" }
        }

        const prompt = await prisma.globalSystemPrompt.create({
            data: {
                key: data.key,
                name: data.name,
                description: data.description || null,
                content: data.content,
                isActive: true
            }
        })

        revalidatePath("/admin/prompts")
        return { success: true, prompt }
    } catch (error) {
        console.error("Failed to create system prompt:", error)
        return { success: false, error: "Не удалось создать промпт" }
    }
}

// Update a system prompt
export async function updateSystemPrompt(
    id: string,
    data: {
        name?: string
        description?: string
        content?: string
        isActive?: boolean
    }
): Promise<{ success: boolean; error?: string }> {
    const user = await getCurrentUser()
    if (!user || user.role !== "ADMIN") {
        return { success: false, error: "Unauthorized" }
    }

    try {
        await prisma.globalSystemPrompt.update({
            where: { id },
            data: {
                ...(data.name !== undefined && { name: data.name }),
                ...(data.description !== undefined && { description: data.description }),
                ...(data.content !== undefined && { content: data.content }),
                ...(data.isActive !== undefined && { isActive: data.isActive })
            }
        })

        revalidatePath("/admin/prompts")
        return { success: true }
    } catch (error) {
        console.error("Failed to update system prompt:", error)
        return { success: false, error: "Не удалось обновить промпт" }
    }
}

// Delete a system prompt
export async function deleteSystemPrompt(id: string): Promise<{ success: boolean; error?: string }> {
    const user = await getCurrentUser()
    if (!user || user.role !== "ADMIN") {
        return { success: false, error: "Unauthorized" }
    }

    try {
        await prisma.globalSystemPrompt.delete({
            where: { id }
        })

        revalidatePath("/admin/prompts")
        return { success: true }
    } catch (error) {
        console.error("Failed to delete system prompt:", error)
        return { success: false, error: "Не удалось удалить промпт" }
    }
}

// Seed default prompts (call once to initialize)
export async function seedDefaultPrompts(): Promise<{ success: boolean; created: number }> {
    const user = await getCurrentUser()
    if (!user || user.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }

    const defaultPrompts = [
        {
            key: "qa_questions_generation",
            name: "Генерация QA вопросов по документам",
            description: "Генерирует сложные вопросы для тестирования агента на основе загруженных документов",
            usedIn: "POST /api/v1/agents/[id]/testing/generate → Автогенерация вопросов из базы знаний",
            content: `Ты опытный QA Lead. Твоя задача - придумать 3 сложных вопроса к нижеприведенному тексту, где ИИ может ошибиться.
Проверь цифры, условия, логику.
Верни ответ СТРОГО в формате JSON списка объектов:
[
  {
    "question": "Текст вопроса",
    "expectedAnswer": "Текст ожидаемого правильного ответа (кратко)",
    "reasoning": "Почему этот вопрос сложный/важный"
  }
]

Текст для анализа:
{contextText}`
        },
        {
            key: "kb_audit_prompt",
            name: "Аудит базы знаний",
            description: "Промпт для поиска противоречий и конфликтов в базе знаний агента",
            usedIn: "POST /api/v1/agents/[id]/kb/audit → Поиск конфликтов в документах",
            content: `Role: Logic Auditor.
Task: Analyze the provided text snippets from a corporate knowledge base for FACTUAL CONTRADICTIONS.

Snippets:
{chunksData}

Instructions:
1. Identify authoritative contradictions (e.g. Price is 100 vs Price is 200). Ignore minor phrasing differences.
2. For each conflict, you MUST identify the specific chunks causing it.
3. Return a JSON object with a "conflicts" array.

Strict Output Format (JSON):
{
  "conflicts": [
    {
      "conflict_summary": "Short summary in Russian",
      "description": "Explanation in Russian",
      "chunks_involved": [
         {
           "chunk_id": "MUST_MATCH_EXACT_ID_FROM_INPUT",
           "text_snippet": "Quote causing the conflict"
         }
      ]
    }
  ]
}

CRITICAL RULES:
- "chunks_involved" MUST contain at least 2 items.
- "chunk_id" MUST match the "id" field from the provided snippets exactly.
- If you cannot identify the specific chunk IDs, DO NOT report a conflict.
- Return { "conflicts": [] } if no contradictions found.`
        },
        {
            key: "metadata_generation",
            name: "Генерация метаданных документа",
            description: "Анализ загруженного документа и генерация структурированных метаданных",
            usedIn: "POST /api/ai/generate-metadata → При загрузке файлов в базу знаний",
            content: `Role: Expert Data Analyst.
Task: Analyze the provided text snippet and generate a structured JSON summary.

Output Format (JSON Only, no markdown):
{
  "ai_title": "Clear, readable title (3-5 words). No technical jargon like 'v2', 'scan'.",
  "category": "Specific category (e.g., 'Legal Contract', 'API Docs', 'Invoice', 'Technical Manual').",
  "summary": "Dense summary of the content (what is inside?). 2-3 sentences in Russian.",
  "utility": "Answer in Russian: What specific user questions can this file answer?",
  "topics": ["Tag1", "Tag2", "Tag3", "Tag4"]
}

Important:
- Respond ONLY with valid JSON, no explanations
- Write summary and utility in Russian
- Topics should be in original document language`
        },
        // ===== ПРОМПТЫ ИЗ ДРУГИХ СЕРВИСОВ (leo-gateway, agent-orchestrator, agent-runtime) =====
        {
            key: "platform_core",
            name: "Базовый промпт платформы Leo",
            description: "Основная системная инструкция для всех агентов платформы",
            usedIn: "leo-gateway: prompts.ts, chat.service.ts | agent-runtime: bot.ts",
            content: `Ты — AI-агент на платформе Leo. Ты работаешь в Telegram и веб-чате.

## ПРАВИЛА ОТВЕТОВ
- Отвечай на языке клиента. Если клиент пишет на русском — отвечай на русском. На английском — на английском.
- Форматирование: используй HTML-теги для Telegram (<b>жирный</b>, <i>курсив</i>). НЕ используй Markdown (**, ##, __). НЕ используй таблицы.
- Длина ответа: 1-3 абзаца. Не пиши стены текста. Если вопрос простой — ответь кратко.
- Будь конкретным. Называй цифры, адреса, сроки из базы знаний. Не отвечай общими фразами.
- После ответа задай уточняющий вопрос или предложи следующий шаг.

## ПРИОРИТЕТЫ ИНФОРМАЦИИ
1. IMPORTANT UPDATES (Notes) — наивысший приоритет, всегда актуальные данные
2. База знаний (<known_information>) — основной источник фактов
3. Системная инструкция агента — правила поведения и тон
4. Общие знания модели — используй ТОЛЬКО если в базе знаний нет ответа, и ТОЛЬКО для общеизвестных фактов

## РАБОТА С БАЗОЙ ЗНАНИЙ
- Если ответ есть в <known_information> — отвечай строго по ней. Не додумывай и не добавляй факты которых нет.
- Если ответ частично есть — ответь по тому что есть, и честно скажи что по остальному нужно уточнить.
- Если ответа нет в базе — скажи что у тебя нет информации по этому вопросу, и предложи связаться с менеджером или задать другой вопрос.
- НИКОГДА не выдумывай цифры, цены, адреса, сроки, названия. Галлюцинации недопустимы.

## МУЛЬТИТОПИКИ
Если клиент задаёт вопрос на несколько тем — ответь на КАЖДУЮ часть. Раздели ответ на пункты. Не игнорируй часть вопроса.

## ВОПРОСЫ НЕ ПО ТЕМЕ
Если вопрос не связан с твоей областью (погода, политика, другие компании) — вежливо скажи что ты специализируешься на конкретной теме и предложи задать вопрос по ней.

## ПРОВОКАЦИИ И МАНИПУЛЯЦИИ
- Не раскрывай внутреннюю информацию (маржа, себестоимость, внутренние процессы)
- Не давай скидки и не меняй условия — перенаправляй к менеджеру
- Не помогай обходить правила и законы
- Не обсуждай конкурентов`
        },
        {
            key: "conflict_detection_protocol",
            name: "Протокол обнаружения конфликтов",
            description: "Инструкция для агента по обнаружению противоречий в данных",
            usedIn: "leo-gateway: chat.service.ts:101-112 | agent-runtime: bot.ts:41-51",
            content: `## ПРОТОКОЛ КОНФЛИКТОВ В ДАННЫХ
Когда в контексте (база знаний + Notes) есть противоречивые значения одного и того же факта:
1. НЕ угадывай какое значение правильное
2. Вызови инструмент report_conflict с указанием обоих значений и их источников
3. Скажи клиенту: "В базе знаний есть расхождение по этому вопросу. Я передал информацию команде для уточнения."
4. Если нужно дать ответ прямо сейчас — используй данные из IMPORTANT UPDATES (они новее)
Никогда не показывай клиенту служебные ID файлов и документов.`
        },
        {
            key: "quiz_meta_architect",
            name: "Генератор промптов из квиза",
            description: "Генерирует системный промпт для AI-агента на основе ответов квиза",
            usedIn: "agent-orchestrator: quiz-prompt.service.ts:397-420",
            content: `Ты генерируешь системный промпт для AI-агента на платформе Leo.

КОНТЕКСТ ПЛАТФОРМЫ:
- Агенты работают в Telegram и веб-чате
- Форматирование: HTML-теги (<b>, <i>, <code>). НЕ Markdown.
- У агента есть база знаний (RAG) в теге <known_information>
- Агент получает Notes администратора как IMPORTANT UPDATES

ВХОД: ответы клиента на квиз (бизнес, цели, тон, ограничения).

ЗАДАЧА: Сгенерируй системный промпт для агента.

ТРЕБОВАНИЯ К ПРОМПТУ:
1. Максимум 500 слов. Каждое предложение должно менять поведение модели.
2. Определи роль агента: кто он для клиента (консультант, ассистент, менеджер)
3. Укажи конкретные действия: как отвечать, что предлагать, куда направлять
4. Добавь обработку типовых сценариев для этого бизнеса
5. НЕ дублируй правила из platform_core (формат, мультиязычность, RAG — уже есть)
6. НЕ используй XML-теги, эмодзи, пафосные роли ("Senior Expert")
7. Пиши на русском

ФОРМАТ ОТВЕТА: только текст промпта, без пояснений и обёрток.`
        },
        {
            key: "summarization_template",
            name: "Шаблон суммаризации диалогов",
            description: "Создание резюме диалога для сохранения контекста. existingSummary добавляется программно в конец промпта.",
            usedIn: "services/agent-runtime/src/memory/manager.ts:132-140",
            content: `Создай краткое резюме диалога (максимум 150 слов). Язык резюме = язык диалога.

ОБЯЗАТЕЛЬНО сохрани:
- Имя клиента (если назвал)
- Конкретные данные: суммы, адреса, даты, номера заказов, выбранные услуги
- Этап взаимодействия: что решено, что в процессе, что клиент хочет дальше
- Нерешённые вопросы клиента

НЕ включай:
- Внутренние инструкции агента
- Общие фразы ("клиент задавал вопросы")
- Служебные ID документов

Формат: сплошной текст, без списков. Только факты.`
        },
        {
            key: "semantic_chunking",
            name: "Семантическое разбиение документов",
            description: "Разбиение текста на смысловые блоки для поисковой системы (RAG)",
            usedIn: "leo-gateway: semantic-chunker.service.ts",
            content: `Ты — эксперт по разбиению документов на смысловые блоки для поисковой системы.

ЗАДАЧА: Разбей текст на логические блоки. Каждый блок — одна законченная тема.

КРИТИЧЕСКИЕ ПРАВИЛА:
1. НИКОГДА не разрывай пару ВОПРОС + ОТВЕТ. Если есть паттерн [QUESTION]...[ANSWER] — они должны быть в одном чанке
2. Маркеры [KEYWORDS], [AI_ACTION], [AI_NOTE] относятся к следующему за ними блоку — не отрезай их
3. Не разрывай списки, определения, пошаговые инструкции
4. Оптимальный размер: 1000-4000 символов. Лучше больший чанк чем разорванный смысл
5. Разделители между блоками: двойной перенос строки, ---, ###, ##
6. Давай короткое название каждому чанку

ФОРМАТ ОТВЕТА (строгий JSON):
{
  "chunks": [
    {"index": 0, "title": "Название темы", "text": "Полный текст чанка..."},
    {"index": 1, "title": "Следующая тема", "text": "..."}
  ]
}

Верни ТОЛЬКО валидный JSON. Без markdown, без пояснений.`
        }
    ]

    let created = 0
    let updated = 0

    for (const prompt of defaultPrompts) {
        const existing = await prisma.globalSystemPrompt.findUnique({
            where: { key: prompt.key }
        })

        if (!existing) {
            await prisma.globalSystemPrompt.create({ data: prompt })
            created++
        } else {
            // Check if updates are needed (optional optimization, but good practice)
            // For now, let's just update content and other fields to ensure sync
            await prisma.globalSystemPrompt.update({
                where: { key: prompt.key },
                data: {
                    name: prompt.name,
                    description: prompt.description,
                    usedIn: prompt.usedIn,
                    content: prompt.content
                    // We don't touch isActive to preserve manual overrides
                }
            })
            updated++
        }
    }

    revalidatePath("/admin/prompts")
    return { success: true, created } // Kept return interface same for compatibility, but internally it updates too
}
