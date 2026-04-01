import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getBillingSystem } from "@/lib/billing-adapter";
import { trackTokenUsage } from "@/lib/token-tracking";
import { aiFetch, getGatewayUrl, getOrchestratorUrl } from "@/lib/ai-fetch";
import { prisma } from "@/lib/db";

// Quiz answers structure to send to orchestrator
interface QuizAnswers {
    role: string
    salesCta?: string
    salesCtaCustom?: string
    salesPersistence?: string
    salesPersistenceCustom?: string
    leadFilter?: string
    leadFilterCustom?: string
    leadStrategy?: string
    leadStrategyCustom?: string
    surveyQuestions?: string[]
    supportEmpathy?: string
    supportEmpathyCustom?: string
    supportLanguage?: string
    supportLanguageCustom?: string
    infoInterpretation?: string
    infoInterpretationCustom?: string
    infoOfftopic?: string
    infoOfftopicCustom?: string
    toneOfVoice: string
    toneOfVoiceCustom?: string
    responseLength: string
    responseLengthCustom?: string
    fallback: string
    fallbackCustom?: string
    constraints: string[]
    customConstraints: string[]
}

export async function POST(req: Request) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Block generation if user has negative balance or is blocked
        const sub = await prisma.userSubscription.findUnique({ where: { userId: session.user.id } });
        if (sub?.isBlocked || (sub && parseFloat(sub.puBalance.toString()) < 0)) {
            return NextResponse.json(
                { error: "Недостаточно PU баланса. Пожалуйста, пополните баланс." },
                { status: 402 }
            );
        }

        const body = await req.json();
        const { agentName, agentDescription, quizAnswers, role, description, wizardV2 } = body;

        if (!agentName) {
            return NextResponse.json(
                { error: "agentName is required" },
                { status: 400 }
            );
        }

        let response: Response;

        // Wizard V2 generation — direct LLM call with full context
        if (wizardV2) {
            const gatewayUrl = getGatewayUrl();
            if (!gatewayUrl) {
                return NextResponse.json({ error: "Gateway not configured" }, { status: 500 });
            }

            const {
                businessDescription, city, audience,
                parsedWebsiteData, knowledgeAnalysis, manualFaq,
                selectedStyle, responseLength, showSources,
                restrictions, customRestrictions,
                fallbackBehavior, fallbackContact,
            } = wizardV2;

            const servicesInfo = parsedWebsiteData?.services?.length
                ? `\n- Услуги/товары из сайта: ${parsedWebsiteData.services.join(", ")}`
                : "";

            const kbServices = knowledgeAnalysis?.extractedServices?.length
                ? `\n- Услуги из БЗ: ${knowledgeAnalysis.extractedServices.join(", ")}`
                : "";

            const kbFaq = knowledgeAnalysis?.extractedFaq?.length
                ? `\n- FAQ из БЗ:\n${knowledgeAnalysis.extractedFaq.map((f: any) => `  В: ${f.q}\n  О: ${f.a}`).join("\n")}`
                : "";

            const manualFaqText = manualFaq?.length
                ? `\n- FAQ вручную:\n${manualFaq.map((f: any) => `  В: ${f.question}\n  О: ${f.answer}`).join("\n")}`
                : "";

            const allRestrictions = [
                ...(restrictions || []),
                ...(customRestrictions || []),
            ];

            const metaPrompt = `Ты генерируешь системный промпт для AI-агента на платформе Leo.

КОНТЕКСТ ПЛАТФОРМЫ:
- Агенты работают в Telegram и веб-чате
- Форматирование: HTML-теги (<b>, <i>, <code>). НЕ Markdown.
- У агента есть база знаний (RAG) в теге <known_information>
- Агент получает Notes администратора как IMPORTANT UPDATES

ДАННЫЕ О БИЗНЕСЕ:
- Описание: ${businessDescription || "не указано"}
- Город: ${city || "не указан"}
- Аудитория: ${audience || "не указана"}${servicesInfo}${kbServices}${kbFaq}${manualFaqText}

СТИЛЬ ОБЩЕНИЯ:
- Выбранный стиль: ${selectedStyle?.label || "не выбран"}
- Пример ответа в этом стиле: ${selectedStyle?.exampleText || "нет"}
- Длина ответов: ${responseLength === "short" ? "Коротко и по делу" : "Подробно с деталями"}
- Ссылки на источники: ${showSources ? "Да — в конце ответа указывай источник из базы знаний: 'Источник: имя_файла.docx'" : "Нет — не указывать источники"}

ПРАВИЛА:
- Ограничения: ${allRestrictions.length > 0 ? allRestrictions.join("; ") : "нет"}
- Если не знает ответа: ${fallbackBehavior || "не указано"}, контакт: ${fallbackContact || "не указан"}

ЗАДАЧА: Сгенерируй системный промпт для агента "${agentName}".

ТРЕБОВАНИЯ:
1. Максимум 500 слов. Каждое предложение должно менять поведение модели.
2. Стиль ответов должен соответствовать выбранному примеру.
3. Включи конкретные сценарии для ЭТОГО бизнеса (на основе услуг и FAQ).
4. Включи правила из раздела ПРАВИЛА дословно.
5. НЕ дублируй правила из platform_core (формат, мультиязычность, RAG — уже есть).
6. НЕ используй XML-теги, эмодзи, пафосные роли.
7. Пиши на русском.

ФОРМАТ: только текст промпта, без пояснений.`;

            console.log(`[WizardV2] Generating prompt for "${agentName}"`);
            response = await aiFetch(`${gatewayUrl}/api/v1/chat/completions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: session.user.id,
                    model: "claude-sonnet-4-6",
                    temperature: 0.4,
                    max_tokens: 2000,
                    messages: [
                        { role: "user", content: metaPrompt },
                    ],
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Gateway error: ${response.status} ${errorText}`);
                return NextResponse.json({ error: "Failed to generate prompt" }, { status: response.status });
            }

            const data = await response.json();
            const generatedPrompt = data.choices?.[0]?.message?.content || "";

            if (data.usage) {
                await trackTokenUsage({
                    userId: session.user.id,
                    model: "claude-sonnet-4-6",
                    promptTokens: data.usage.prompt_tokens || 0,
                    completionTokens: data.usage.completion_tokens || 0,
                    isTest: true,
                }).catch(console.error);
            }

            return NextResponse.json({
                systemPrompt: generatedPrompt,
                prompt: generatedPrompt,
                usage: data.usage,
            });
        }

        // Legacy: orchestrator-based generation
        const orchestratorUrl = getOrchestratorUrl();

        if (!orchestratorUrl) {
            console.error("AGENT_ORCHESTRATOR_URL is not defined");
            return NextResponse.json({ error: "Service Configuration Error" }, { status: 500 });
        }

        if (quizAnswers?.role) {
            console.log(`[Proxy] Quiz-based prompt generation`);
            response = await aiFetch(`${orchestratorUrl}/api/v1/generate-agent-prompt-from-quiz`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: session.user.id,
                    agentName,
                    agentDescription,
                    quizAnswers,
                })
            });
        } else {
            const gatewayUrl = getGatewayUrl();
            console.log(`[Proxy] Simple prompt generation`);
            response = await aiFetch(`${gatewayUrl}/api/v1/generate-agent-prompt`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: session.user.id,
                    agentName,
                    role: role || agentDescription || '',
                    description: description || agentDescription || '',
                })
            });
        }

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Gateway error: ${response.status} ${errorText}`);
            return NextResponse.json(
                { error: "Failed to generate prompt upstream" },
                { status: response.status }
            );
        }

        const data = await response.json();

        // Track token usage and deduct from balance
        if (data.usage) {
            try {
                const promptTokens = data.usage.prompt_tokens || 0;
                const completionTokens = data.usage.completion_tokens || 0;
                const totalTokens = promptTokens + completionTokens;
                const puCost = totalTokens / 1000; // 1 PU = 1000 tokens

                // Track usage
                // Track usage (isTest: true to prevent auto-deduction in trackTokenUsage)
                await trackTokenUsage({
                    userId: session.user.id,
                    model: "claude-sonnet-4-6",
                    promptTokens,
                    completionTokens,
                    responseTimeMs: 0,
                    isTest: true, // Free generation
                });

                // Deduct from billing system - DISABLED per request
                /*
                await billing.deductUsage(session.user.id, puCost, {
                    source: 'LLM_USAGE',
                    description: `Prompt generation: ${totalTokens} tokens`,
                    metadata: {
                        model: 'claude-sonnet-4-6',
                        promptTokens,
                        completionTokens,
                        agentName,
                    },
                });
                */
            } catch (trackError) {
                console.error(`Failed to process token usage for prompt generation:`, trackError);
            }
        }

        return NextResponse.json(data);

    } catch (error) {
        console.error("Error generating agent prompt from quiz:", error);
        return NextResponse.json(
            { error: "Failed to generate prompt" },
            { status: 500 }
        );
    }
}
