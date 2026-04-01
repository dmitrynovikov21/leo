"use client"

import * as React from "react"

interface MarkdownTextProps {
    children: string
    className?: string
}

/**
 * Компонент для рендеринга текста с поддержкой:
 * - HTML-тегов: <b>, <i>, <code> (как от Telegram-ботов)
 * - Markdown: **bold**, *italic*
 * - \n -> перенос строки
 * - Эмодзи
 */
export function MarkdownText({ children, className }: MarkdownTextProps) {
    const html = React.useMemo(() => {
        let text = children || ''

        // Заменяем \\n на \n (если API возвращает escaped)
        text = text.replace(/\\n/g, '\n')

        // Escape HTML кроме разрешённых тегов
        // Сначала временно заменяем разрешённые теги на плейсхолдеры
        const allowed: [RegExp, string][] = [
            [/<b>([\s\S]*?)<\/b>/gi, '%%B_OPEN%%$1%%B_CLOSE%%'],
            [/<strong>([\s\S]*?)<\/strong>/gi, '%%B_OPEN%%$1%%B_CLOSE%%'],
            [/<i>([\s\S]*?)<\/i>/gi, '%%I_OPEN%%$1%%I_CLOSE%%'],
            [/<em>([\s\S]*?)<\/em>/gi, '%%I_OPEN%%$1%%I_CLOSE%%'],
            [/<code>([\s\S]*?)<\/code>/gi, '%%CODE_OPEN%%$1%%CODE_CLOSE%%'],
        ]

        for (const [regex, replacement] of allowed) {
            text = text.replace(regex, replacement)
        }

        // Escape remaining HTML
        text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

        // Restore allowed tags
        text = text
            .replace(/%%B_OPEN%%/g, '<strong class="font-semibold">')
            .replace(/%%B_CLOSE%%/g, '</strong>')
            .replace(/%%I_OPEN%%/g, '<em>')
            .replace(/%%I_CLOSE%%/g, '</em>')
            .replace(/%%CODE_OPEN%%/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm">')
            .replace(/%%CODE_CLOSE%%/g, '</code>')

        // Markdown: **bold** -> <strong>
        text = text.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
        // Markdown: *italic* -> <em> (but not **)
        text = text.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')

        // Newlines -> <br>
        text = text.replace(/\n/g, '<br/>')

        return text
    }, [children])

    return (
        <span
            className={className}
            dangerouslySetInnerHTML={{ __html: html }}
        />
    )
}
