"use server"

import { runApifyCrawler } from "@/lib/apify"
import { getCurrentUser } from "@/lib/session"

export async function scrapeWebsite(url: string) {
    const user = await getCurrentUser()
    if (!user) {
        return { success: false, error: "Unauthorized" }
    }

    try {
        console.log(`[scrapeWebsite] Starting scraping for ${url}`)
        // Add protocol if missing
        if (!url.startsWith('http')) {
            url = 'https://' + url
        }

        const items = await runApifyCrawler(url)

        if (!items || items.length === 0) {
            return { success: false, error: "Не удалось получить данные со страницы. Проверьте URL и попробуйте снова." }
        }

        const combinedText = items
            .map((item: any) => item.text || item.markdown || "")
            .filter((t: string) => t.length > 0)
            .join("\n\n---\n\n")

        if (combinedText.length === 0) {
            return { success: false, error: "Страница не содержит текстового контента" }
        }

        const title = items[0]?.metadata?.title || items[0]?.title || url

        return {
            success: true,
            data: {
                title,
                content: combinedText,
                url
            }
        }

    } catch (error) {
        console.error("Scraping failed:", error)
        return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
    }
}
