import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getBillingSystem } from "@/lib/billing-adapter";
import { trackTokenUsage } from "@/lib/token-tracking";

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

        // Check user balance before proceeding
        const billing = await getBillingSystem(session.user.id);
        const hasBalance = await billing.checkBalance(session.user.id, 0.2); // 200 tokens = 0.2 PU
        if (!hasBalance) {
            return NextResponse.json(
                { error: "Insufficient balance. Please upgrade your plan or purchase additional Processing Units." },
                { status: 402 }
            );
        }

        const body = await req.json();
        const { agentName, agentDescription, quizAnswers } = body;

        if (!agentName || !quizAnswers?.role) {
            return NextResponse.json(
                { error: "agentName and quizAnswers.role are required" },
                { status: 400 }
            );
        }

        // Use orchestrator URL
        const orchestratorUrl = process.env.AGENT_ORCHESTRATOR_URL;

        if (!orchestratorUrl) {
            console.error("AGENT_ORCHESTRATOR_URL is not defined");
            return NextResponse.json({ error: "Service Configuration Error" }, { status: 500 });
        }

        console.log(`[Proxy] Forwarding quiz-based prompt generation to ${orchestratorUrl}/api/v1/generate-agent-prompt-from-quiz`);

        // Proxy request to orchestrator with quiz data
        const response = await fetch(`${orchestratorUrl}/api/v1/generate-agent-prompt-from-quiz`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: session.user.id,
                agentName,
                agentDescription,
                quizAnswers,
            })
        });

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
                await trackTokenUsage({
                    userId: session.user.id,
                    model: "gpt-4o",
                    promptTokens,
                    completionTokens,
                    responseTimeMs: 0,
                    isTest: false,
                    requestType: 'INSTRUCTION_GEN',
                });

                // Deduct from billing system
                await billing.deductUsage(session.user.id, puCost, {
                    source: 'LLM_USAGE',
                    description: `Prompt generation: ${totalTokens} tokens`,
                    metadata: {
                        model: 'gpt-4o',
                        promptTokens,
                        completionTokens,
                        agentName,
                    },
                });
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
