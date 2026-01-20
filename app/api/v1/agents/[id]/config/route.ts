import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/v1/agents/[id]/config
 * 
 * Returns agent configuration with notes merged into systemPrompt.
 * This endpoint is meant for external services (Orchestrator/Gateway) 
 * to get the complete prompt including user notes.
 * 
 * Notes are added at the end of systemPrompt with "ЗАМЕТКИ:" label
 * and are NOT vectorized - they go directly into the context.
 */
export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const agentId = params.id;

        if (!agentId) {
            return NextResponse.json(
                { error: "Agent ID is required" },
                { status: 400 }
            );
        }

        // Fetch agent with notes
        const agent = await prisma.agent.findUnique({
            where: { id: agentId },
            include: {
                notes: {
                    orderBy: { createdAt: 'asc' }
                },
                knowledgeBases: true
            }
        });

        if (!agent) {
            return NextResponse.json(
                { error: "Agent not found" },
                { status: 404 }
            );
        }

        // Build merged system prompt with notes
        let mergedSystemPrompt = agent.systemPrompt || "";

        if (agent.notes && agent.notes.length > 0) {
            const notesSection = agent.notes
                .map(note => `### ${note.title}\n${note.content}`)
                .join("\n\n");

            mergedSystemPrompt = `${mergedSystemPrompt}

---

ЗАМЕТКИ:

${notesSection}`;
        }

        // Return agent config with merged prompt
        return NextResponse.json({
            id: agent.id,
            name: agent.name,
            role: agent.role,
            description: agent.description,
            systemPrompt: mergedSystemPrompt,
            originalSystemPrompt: agent.systemPrompt,
            temperature: agent.temperature,
            debounceMs: agent.debounceMs,
            tone: agent.tone,
            guardrails: agent.guardrails,
            welcomeMessage: agent.welcomeMessage,
            workSchedule: agent.workSchedule,
            holidays: agent.holidays,
            offlineMessage: agent.offlineMessage,
            avatarEmoji: agent.avatarEmoji,
            displayName: agent.displayName,
            telegramToken: agent.telegramToken,
            status: agent.status,
            notesCount: agent.notes?.length || 0,
            knowledgeBasesCount: agent.knowledgeBases?.length || 0
        });

    } catch (error) {
        console.error("Error fetching agent config:", error);
        return NextResponse.json(
            { error: "Failed to fetch agent config" },
            { status: 500 }
        );
    }
}
