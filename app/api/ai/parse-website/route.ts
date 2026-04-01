import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { scrapeWebsite } from "@/actions/apify";
import { aiFetch, getGatewayUrl } from "@/lib/ai-fetch";
import { trackTokenUsage } from "@/lib/token-tracking";

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { url } = await req.json();
        if (!url) {
            return NextResponse.json({ error: "url is required" }, { status: 400 });
        }

        // 1. Scrape website via Apify
        const scrapeResult = await scrapeWebsite(url);
        if (!scrapeResult.success || !scrapeResult.data) {
            return NextResponse.json({
                error: scrapeResult.error || "Failed to scrape website",
            }, { status: 422 });
        }

        const pageText = scrapeResult.data.content.slice(0, 8000); // Limit for LLM

        // 2. Extract business info via LLM
        const gatewayUrl = getGatewayUrl();
        if (!gatewayUrl) {
            return NextResponse.json({ error: "Gateway not configured" }, { status: 500 });
        }

        const systemPrompt = `Ты аналитик. Проанализируй текст сайта и извлеки информацию о бизнесе.
Ответь ТОЛЬКО валидным JSON без markdown-обёрток:
{
  "companyName": "название компании",
  "businessDescription": "чем занимается (2-3 предложения)",
  "services": ["услуга 1", "услуга 2"],
  "city": "город или 'Онлайн'",
  "contacts": {
    "phone": "телефон если есть",
    "email": "email если есть",
    "address": "адрес если есть"
  },
  "audience": "b2c или b2b или mixed"
}
Если чего-то нет на сайте — поставь null.`;

        const response = await aiFetch(`${gatewayUrl}/api/v1/chat/completions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userId: session.user.id,
                model: "claude-sonnet-4-6",
                temperature: 0.2,
                max_tokens: 800,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `Текст сайта ${url}:\n\n${pageText}` },
                ],
            }),
        });

        if (!response.ok) {
            console.error("LLM parse-website failed:", response.status);
            // Return scrape data even if LLM fails
            return NextResponse.json({
                rawText: scrapeResult.data.content.slice(0, 2000),
                title: scrapeResult.data.title,
                parsed: null,
            });
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || "{}";

        // Track usage (free)
        if (data.usage) {
            await trackTokenUsage({
                userId: session.user.id,
                model: "claude-sonnet-4-6",
                promptTokens: data.usage.prompt_tokens || 0,
                completionTokens: data.usage.completion_tokens || 0,
                responseTimeMs: 0,
                isTest: true,
            }).catch(console.error);
        }

        let parsed;
        try {
            const cleaned = content.replace(/```json\n?/g, "").replace(/```/g, "").trim();
            parsed = JSON.parse(cleaned);
        } catch {
            parsed = null;
        }

        return NextResponse.json({
            title: scrapeResult.data.title,
            rawText: scrapeResult.data.content.slice(0, 2000),
            parsed,
        });
    } catch (error) {
        console.error("parse-website error:", error);
        return NextResponse.json({ error: "Failed to parse website" }, { status: 500 });
    }
}
