import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getActivePromptContent } from "@/actions/system-prompts";

// POST /api/v1/agents/[agentId]/testing/generate
export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const agentId = id;

        // 1. Fetch Agent and its Knowledge Bases
        const agent = await prisma.agent.findUnique({
            where: { id: agentId },
            include: {
                knowledgeBases: {
                    where: { status: "VECTORIZED" },
                    take: 5
                }
            }
        });

        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        // Flatten knowledge items
        const knowledgeItems = agent.knowledgeBases;

        if (knowledgeItems.length === 0) {
            return NextResponse.json({ message: "Не найдены документы для анализа", generatedCount: 0 });
        }

        let totalGenerated = 0;
        const gatewayUrl = process.env.AI_GATEWAY_URL;
        const debugLogs: string[] = [];

        debugLogs.push(`Found ${knowledgeItems.length} vectorized files.`);

        // 2. For each file, if it fits criteria, generate questions
        for (const item of knowledgeItems) {
            // Check if we already have questions for this file
            const existingCount = await prisma.fileQaQuestion.count({
                where: { knowledgeBaseId: item.id }
            });

            if (existingCount > 0) {
                debugLogs.push(`File ${item.filename} skipped: ${existingCount} questions exist.`);
                continue;
            }

            // 3. Get chunks logic - DocumentChunk
            const chunks = await prisma.documentChunk.findMany({
                where: { knowledgeBaseId: item.id },
                take: 3
            });

            if (chunks.length === 0) {
                debugLogs.push(`File ${item.filename} skipped: No chunks found.`);
                continue;
            }

            const contextText = chunks.map(c => c.content).join("\n\n").slice(0, 10000);

            if (!contextText) {
                debugLogs.push(`File ${item.filename} skipped: Empty context.`);
                continue;
            }

            debugLogs.push(`Generating for ${item.filename}...`);

            try {
                // Get prompts from DB (with fallback to hardcoded)
                const qaPromptTemplate = await getActivePromptContent("qa_questions_generation") || `Ты опытный QA Lead. Твоя задача - придумать 3 сложных вопроса к нижеприведенному тексту, где ИИ может ошибиться.
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
{contextText}`;

                // Replace placeholder with actual context
                const prompt = qaPromptTemplate.replace("{contextText}", contextText);

                // Using specific model/provider via Gateway if possible
                const completionResponse = await fetch(`${gatewayUrl}/api/v1/chat/completions`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${process.env.AI_GATEWAY_KEY || 'default'}`,
                        "x-user-id": session.user.id || "anonymous"
                    },
                    body: JSON.stringify({
                        userId: session.user.id,
                        model: "gpt-4o",
                        messages: [
                            { role: "user", content: prompt }
                        ],
                    })
                });

                if (completionResponse.ok) {
                    const data = await completionResponse.json();
                    debugLogs.push(`Gateway response OK for ${item.filename}`);
                    let content = data.choices[0].message.content;

                    // Strip markdown code blocks if present
                    content = content.replace(/```json\n?/g, "").replace(/```/g, "").trim();

                    const parsed = JSON.parse(content);
                    const questions = parsed.questions || parsed; // Handle { questions: [] } or []

                    if (Array.isArray(questions)) {
                        // Save questions
                        await prisma.$transaction(
                            questions.map((q: any) => prisma.fileQaQuestion.create({
                                data: {
                                    knowledgeBaseId: item.id,
                                    agentId: agent.id,
                                    question: q.question,
                                    expectedAnswer: q.expectedAnswer,
                                    expectedReasoning: q.reasoning,
                                    sourceType: "FILE"
                                }
                            }))
                        );
                        totalGenerated += questions.length;
                    } else {
                        debugLogs.push(`Invalid JSON format for ${item.filename}`);
                    }
                } else {
                    const errText = await completionResponse.text();
                    debugLogs.push(`Gateway error for ${item.filename}: ${completionResponse.status} | ${errText}`);
                }
            } catch (err) {
                console.error(`Failed to generate questions for file ${item.filename}:`, err);
                debugLogs.push(`Exception for ${item.filename}: ${err}`);
            }
        }

        return NextResponse.json({
            success: true,
            generatedCount: totalGenerated,
            message: `Generated ${totalGenerated} new questions`,
            debug: debugLogs
        });

    } catch (error) {
        console.error("Error generating questions:", error);
        return NextResponse.json({ error: "Failed to generate questions" }, { status: 500 });
    }
}
