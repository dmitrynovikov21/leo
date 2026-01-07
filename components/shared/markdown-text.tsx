"use client"

import * as React from "react"

interface MarkdownTextProps {
    children: string
    className?: string
}

/**
 * Простой компонент для рендеринга текста с базовым markdown:
 * - \n -> перенос строки
 * - **text** -> жирный текст
 * - *text* -> курсив
 * - Сохраняет эмодзи
 */
export function MarkdownText({ children, className }: MarkdownTextProps) {
    const renderMarkdown = (text: string): React.ReactNode[] => {
        // Заменяем \\n на \n (если API возвращает escaped)
        const normalized = text.replace(/\\n/g, '\n')

        // Разбиваем по строкам
        const lines = normalized.split('\n')

        return lines.map((line, lineIdx) => {
            // Обрабатываем **bold** и *italic*
            const parts = parseInlineMarkdown(line)

            return (
                <React.Fragment key={lineIdx}>
                    {parts}
                    {lineIdx < lines.length - 1 && <br />}
                </React.Fragment>
            )
        })
    }

    const parseInlineMarkdown = (text: string): React.ReactNode[] => {
        const result: React.ReactNode[] = []
        let remaining = text
        let key = 0

        while (remaining.length > 0) {
            // Ищем **bold**
            const boldMatch = remaining.match(/\*\*(.+?)\*\*/)
            // Ищем *italic* (но не **)
            const italicMatch = remaining.match(/(?<!\*)\*([^*]+)\*(?!\*)/)

            // Определяем какой паттерн раньше
            const boldIdx = boldMatch ? remaining.indexOf(boldMatch[0]) : Infinity
            const italicIdx = italicMatch ? remaining.indexOf(italicMatch[0]) : Infinity

            if (boldIdx === Infinity && italicIdx === Infinity) {
                // Нет больше паттернов
                result.push(remaining)
                break
            }

            if (boldIdx <= italicIdx && boldMatch) {
                // Bold первый
                if (boldIdx > 0) {
                    result.push(remaining.substring(0, boldIdx))
                }
                result.push(
                    <strong key={key++} className="font-semibold">
                        {boldMatch[1]}
                    </strong>
                )
                remaining = remaining.substring(boldIdx + boldMatch[0].length)
            } else if (italicMatch) {
                // Italic первый
                if (italicIdx > 0) {
                    result.push(remaining.substring(0, italicIdx))
                }
                result.push(
                    <em key={key++}>
                        {italicMatch[1]}
                    </em>
                )
                remaining = remaining.substring(italicIdx + italicMatch[0].length)
            }
        }

        return result
    }

    return (
        <span className={className}>
            {renderMarkdown(children)}
        </span>
    )
}
