"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export type GlobalSystemPromptData = {
    id: string
    key: string
    name: string
    description: string | null
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
            key: "agent_creation_template",
            name: "Шаблон создания агента",
            description: "Базовый промпт для генерации инструкции нового агента на основе описания пользователя",
            content: `Ты — AI-ассистент по созданию агентов.

На основе описания пользователя сгенерируй системный промпт для нового агента.

Описание: {description}
Имя агента: {agentName}
Роль: {role}

Правила для генерации:
- Промпт должен быть на русском языке
- Чётко описать роль и обязанности агента
- Указать стиль общения (формальный/неформальный)
- Добавить ограничения (что агент НЕ должен делать)
- Быть конкретным и практичным`
        },
        {
            key: "test_generation",
            name: "Генерация тестов для агента",
            description: "Промпт для AI-судьи, генерирующего тестовые вопросы для проверки агента",
            content: `Ты — AI-судья для тестирования агентов.

Системный промпт тестируемого агента:
{systemPrompt}

Сгенерируй 5-10 тестовых вопросов для проверки этого агента:
1. Базовые вопросы по его функционалу
2. Краевые случаи
3. Провокационные вопросы (попытка выйти за рамки роли)
4. Вопросы на проверку ограничений

Формат ответа: JSON массив объектов с полями question и expectedBehavior`
        },
        {
            key: "document_analysis",
            name: "Анализ документа",
            description: "Промпт для извлечения структурированной информации из загруженных документов",
            content: `Проанализируй следующий документ и извлеки ключевую информацию.

Документ:
{documentContent}

Выдели:
- Основные темы и понятия
- Ключевые факты и данные
- Важные правила или процедуры
- Термины и определения

Ответ должен быть структурирован и готов для использования в базе знаний агента.`
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
