import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getActivePromptContent } from "@/actions/system-prompts";
import { checkUserBalance } from "@/lib/balance";
import { trackTokenUsage } from "@/lib/token-tracking";

// POST /api/v1/agents/[id]/kb/audit
export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check user balance before proceeding
        //  const hasBalance = await checkUserBalance(session.user.id, 1000);
        //  if (!hasBalance) {
        //      return NextResponse.json(
        //          { error: "Insufficient token balance. Please top up your account." },
        //          { status: 402 }
        //      );
        //  }

        const { id: agentId } = await params;

        // 1. Fetch chunks
        // We limit to a reasonable amount to avoid timeout/token limits for this v1
        const chunks = await prisma.documentChunk.findMany({
            where: {
                knowledgeBase: {
                    agentId: agentId,
                    status: "VECTORIZED"
                }
            },
            take: 50, // Reduced from 200 to ensure reliability
            include: {
                knowledgeBase: true
            }
        });

        if (chunks.length < 2) {
            return NextResponse.json({ message: "Not enough chunks to audit." });
        }

        // 2. Prepare text for AI
        // We'll send a single batch for now. In production, this should be a queue/background job.
        const chunksData = chunks.map(c => ({
            id: c.id,
            source: c.knowledgeBase.filename,
            text: c.content.slice(0, 500) // Truncate slightly to save tokens if needed
        }));

        // Get prompts from DB (with fallback)
        const auditPromptTemplate = await getActivePromptContent("kb_audit_prompt") || `Role: Logic Auditor.
Task: Analyze the provided text snippets from a corporate knowledge base for FACTUAL CONTRADICTIONS.

Snippets:
{chunksData}

Instructions:
1. Identify authoritative contradictions (e.g. Price is 100 vs Price is 200). Ignore minor phrasing differences.
2. For each conflict, you MUST identify the specific chunks causing it.
3. Return a JSON object with a "conflicts" array.

Strict Output Format (JSON):
{
  "conflicts": [
    {
      "conflict_summary": "Short summary in Russian",
      "description": "Explanation in Russian",
      "chunks_involved": [
         {
           "chunk_id": "MUST_MATCH_EXACT_ID_FROM_INPUT",
           "text_snippet": "Quote causing the conflict"
         }
      ]
    }
  ]
}

CRITICAL RULES:
- "chunks_involved" MUST contain at least 2 items.
- "chunk_id" MUST match the "id" field from the provided snippets exactly.
- If you cannot identify the specific chunk IDs, DO NOT report a conflict.
- Return { "conflicts": [] } if no contradictions found.`;

        // Replace placeholder with actual data
        const prompt = auditPromptTemplate.replace("{chunksData}", JSON.stringify(chunksData, null, 2));

        const gatewayUrl = process.env.AI_GATEWAY_URL;

        // 3. Call AI
        const response = await fetch(`${gatewayUrl}/api/v1/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.AI_GATEWAY_KEY || 'default'}`,
                "x-user-id": session.user.id
            },
            body: JSON.stringify({
                userId: session.user.id,
                model: "gpt-4o",
                messages: [
                    { role: "user", content: prompt }
                ]
            })
        });

        if (!response.ok) {
            const err = await response.text();
            console.error("AI Audit Request Failed", err);
            return NextResponse.json({ error: "AI Audit failed" }, { status: 500 });
        }

        const data = await response.json();

        // Track token usage
        if (data.usage) {
            try {
                await trackTokenUsage({
                    userId: session.user.id,
                    agentId: agentId,
                    model: "gpt-4o",
                    promptTokens: data.usage.prompt_tokens || 0,
                    completionTokens: data.usage.completion_tokens || 0,
                    responseTimeMs: 0,
                    isTest: false,
                });
            } catch (trackError) {
                console.error(`Failed to track token usage for KB audit:`, trackError);
            }
        }
        let content = data.choices?.[0]?.message?.content || "{}";

        // Cleanup markdown
        content = content.replace(/```json\n?/g, "").replace(/```/g, "").trim();

        let parsed;
        try {
            parsed = JSON.parse(content);
        } catch (e) {
            console.error("Failed to parse AI response", content);
            return NextResponse.json({ error: "Invalid AI response" }, { status: 500 });
        }

        const conflicts = parsed.conflicts || [];

        // 4. Save conflicts
        if (conflicts.length > 0) {
            // Delete old NEW conflicts to avoid dupes? Or just append?
            // User requirement: "If has_conflict: true, save record"
            // Let's create them.

            await prisma.$transaction(
                conflicts.map((c: any) => prisma.knowledgeConflict.create({
                    data: {
                        userId: session.user.id,
                        agentId: agentId,
                        topic: c.conflict_summary,
                        details: c, // Payload
                        status: "NEW"
                    }
                }))
            );
        }

        return NextResponse.json({
            success: true,
            conflictsFound: conflicts.length
        });

    } catch (error) {
        console.error("Audit error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
