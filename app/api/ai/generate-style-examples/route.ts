import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { aiFetch, getGatewayUrl } from "@/lib/ai-fetch";
import { trackTokenUsage } from "@/lib/token-tracking";

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { businessDescription, audience, city, parsedData } = await req.json();

        if (!businessDescription) {
            return NextResponse.json({ error: "businessDescription required" }, { status: 400 });
        }

        const gatewayUrl = getGatewayUrl();
        if (!gatewayUrl) {
            return NextResponse.json({ error: "Gateway not configured" }, { status: 500 });
        }

        const servicesInfo = parsedData?.services?.length
            ? `\nУслуги: ${parsedData.services.join(", ")}`
            : "";

        const systemPrompt = `Ты помогаешь настроить AI-агента для бизнеса.

Бизнес: ${businessDescription}
Город: ${city || "не указан"}
Аудитория: ${audience || "не указана"}${servicesInfo}

Придумай ОДИН типичный вопрос, который задал бы клиент этого бизнеса.
Затем напиши ТРИ варианта ответа на этот вопрос в разных стилях:
A — Деловой (чёткий, профессиональный, по делу)
Б — Дружелюбный (тёплый, с участием, "рад помочь")
В — Лаконичный (минимум слов, максимум пользы)

Ответь ТОЛЬКО валидным JSON без markdown-обёрток:
{
  "sampleQuestion": "вопрос клиента",
  "styles": [
    { "id": "A", "label": "Деловой", "text": "ответ в деловом стиле" },
    { "id": "B", "label": "Дружелюбный", "text": "ответ в дружелюбном стиле" },
    { "id": "C", "label": "Лаконичный", "text": "ответ в лаконичном стиле" }
  ]
}`;

        const response = await aiFetch(`${gatewayUrl}/api/v1/chat/completions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userId: session.user.id,
                model: "claude-sonnet-4-6",
                temperature: 0.7,
                max_tokens: 800,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: "Сгенерируй вопрос и варианты ответов." },
                ],
            }),
        });

        if (!response.ok) {
            return NextResponse.json({ error: "LLM call failed" }, { status: 502 });
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || "{}";

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

        try {
            const cleaned = content.replace(/```json\n?/g, "").replace(/```/g, "").trim();
            const parsed = JSON.parse(cleaned);
            return NextResponse.json(parsed);
        } catch {
            return NextResponse.json({ error: "Failed to parse LLM response" }, { status: 502 });
        }
    } catch (error) {
        console.error("generate-style-examples error:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
