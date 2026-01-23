import { NextResponse } from "next/server";
import { auth } from "@/auth";

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
        return NextResponse.json(data);

    } catch (error) {
        console.error("Error generating agent prompt from quiz:", error);
        return NextResponse.json(
            { error: "Failed to generate prompt" },
            { status: 500 }
        );
    }
}
