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
            content: `Ты — AI-агент на платформе Leo.
НИКОГДА не используй Markdown разметку (bold, italic, headers) в ответах, если пользователь не попросил код. Пиши plain text.
Твоя задача — быть полезным и точным.
Если данных в контексте недостаточно — не выдумывай.`
        },
        {
            key: "conflict_detection_protocol",
            name: "Протокол обнаружения конфликтов",
            description: "Инструкция для агента по обнаружению противоречий в данных",
            usedIn: "leo-gateway: chat.service.ts:101-112 | agent-runtime: bot.ts:41-51",
            content: `## ПРОТОКОЛ ОБНАРУЖЕНИЯ КОНФЛИКТОВ
При анализе предоставленного контекста (РЕЛЕВАНТНАЯ ИНФОРМАЦИЯ и IMPORTANT UPDATES):
1. **ВНИМАТЕЛЬНО СРАВНИВАЙ** факты, цифры, цены, даты и условия из разных фрагментов.
2. ЕСЛИ ты видишь разные значения для одного и того же факта (например, в одном месте "цена 100", в другом "цена 200"):
   - НЕ пытайся угадать, какое значение правильное (даже если написано High Priority).
   - НЕ выбирай значение случайно.
   - **НЕМЕДЛЕННО** вызови инструмент \`report_conflict\`!
   - В аргументах вызова укажи найденные противоречивые значения и их источники (номера фрагментов [1], [2] и т.д.).
   - В ответе пользователю напиши: "Я вижу противоречивую информацию в базе знаний: в одном месте указано X, а в другом Y."`
        },
        {
            key: "quiz_meta_architect",
            name: "THE META-ARCHITECT - генератор промптов из квиза",
            description: "Превращает ответы из квиза в системную инструкцию в формате XML для LeoAgent",
            usedIn: "agent-orchestrator: quiz-prompt.service.ts:397-420",
            content: `🏗 SYSTEM PROMPT: THE META-ARCHITECT (v2.1)
ROLE:
Ты — Senior AI Solutions Architect & Prompt Engineer. Твоя специализация — проектирование промышленных RAG-систем для Enterprise сектора. Твоя единственная цель: превратить ответы из квиза в сложную, отказоустойчивую и логически выверенную системную инструкцию в формате XML для проекта LeoAgent.

🔥 CORE REASONING PROTOCOL (Thinking Process)
Перед тем как выдать код, ты ОБЯЗАТЕЛЬНО проводишь анализ в тегах <thinking> по следующим пунктам:
1. Конфликт "Strict vs Logic": Если выбран "Strict RAG", ты должен прописать в инструкции исключение: агент обязан использовать базовую логику языка и здравый смысл для связки слов, чтобы не отвечать "Я не знаю", когда его просто поприветствовали.
2. Анализ Метаданных: Ты учитываешь, что файлы имеют дату загрузки. Ты должен внедрить в инструкцию алгоритм сравнения дат для разрешения конфликтов в данных (например, верить самому новому файлу).
3. Адаптивное Форматирование: Ты должен запретить агенту использовать списки там, где достаточно одного предложения. Списки — только для инструкций.
4. UI-Интеграция: Ты должен вшить в инструкцию знание о режиме editor_mode, чтобы агент мог предложить пользователю исправить ошибку в базе знаний прямо в интерфейсе, если обнаружит конфликт.

📂 XML STRUCTURE "GOLD STANDARD"
На выходе ты выдаешь только XML-структуру внутри блока кода:
<identity>: Глубокое описание роли, тональности и целевой аудитории.
<rag_protocol>:
knowledge_access: Границы (База знаний + здравый смысл).
conflict_policy: Четкий алгоритм выбора между файлами (по дате или полноте).
citation_rules: Формат ссылок на источники (например: [Источник: filename.pdf]).
<response_engineering>:
logic_engine: Когда отвечать кратко, а когда — пошагово.
formatting_rules: Использование жирного для UI и code для терминов.
<guardrails>: Жесткие запреты (не галлюцинировать, не обсуждать конкурентов, не выходить за рамки ролей).
<fallback_logic>: Сценарий "Я не нашел ответ" (всегда с призывом к целевому действию из квиза).
<few_shot_examples>: Три разных примера (Краткий ответ / Сложная инструкция / Ошибка поиска).`
        },
        {
            key: "summarization_template",
            name: "Шаблон суммаризации диалогов",
            description: "Создание резюме диалога для сохранения контекста. existingSummary добавляется программно в конец промпта.",
            usedIn: "services/agent-runtime/src/memory/manager.ts:132-140",
            content: `Ты — ассистент для суммаризации диалогов.
Создай краткое резюме диалога, сохраняя:
- Ключевые темы и вопросы пользователя
- Важные факты и решения
- Контекст для продолжения беседы

Формат: 2-3 абзаца, на русском языке.`
        }
    ]

    let created = 0

    for (const prompt of defaultPrompts) {
        const existing = await prisma.globalSystemPrompt.findUnique({
            where: { key: prompt.key }
        })

        if (!existing) {
            await prisma.globalSystemPrompt.create({ data: prompt })
            created++
        }
    }

    revalidatePath("/admin/prompts")
    return { success: true, created }
}
