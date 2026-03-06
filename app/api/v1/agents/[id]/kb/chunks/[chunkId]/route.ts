import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

// PATCH /api/v1/agents/[id]/kb/chunks/[chunkId]
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string; chunkId: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: agentId, chunkId } = await params;
        const { content } = await req.json();

        // Find the chunk and its parent document
        const chunk = await prisma.documentChunk.findUnique({
            where: { id: chunkId },
            include: {
                knowledgeBase: {
                    select: { id: true, agentId: true }
                }
            }
        });

        if (!chunk || chunk.knowledgeBase.agentId !== agentId) {
            return NextResponse.json({ error: "Chunk not found" }, { status: 404 });
        }

        const docId = chunk.knowledgeBaseId;
        const gatewayUrl = process.env.AI_GATEWAY_URL;

        // Forward edit to gateway for re-enrichment + Chroma re-vectorization
        if (gatewayUrl) {
            try {
                const gatewayResponse = await fetch(
                    `${gatewayUrl}/api/v1/agent-documents/${agentId}/documents/${docId}/chunks/${chunkId}`,
                    {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text: content }),
                    }
                );

                if (gatewayResponse.ok) {
                    const gatewayData = await gatewayResponse.json();

                    // Update context in local DB if gateway returned it
                    if (gatewayData.context !== undefined) {
                        await prisma.documentChunk.update({
                            where: { id: chunkId },
                            data: { context: gatewayData.context }
                        });
                    }
                } else {
                    console.warn(`Gateway PATCH failed (${gatewayResponse.status}), updating locally only`);
                    // Fallback: update locally
                    await prisma.documentChunk.update({
                        where: { id: chunkId },
                        data: { content }
                    });
                }
            } catch (gatewayErr) {
                console.warn("Gateway PATCH error, updating locally:", gatewayErr);
                await prisma.documentChunk.update({
                    where: { id: chunkId },
                    data: { content }
                });
            }
        } else {
            // No gateway configured — update locally only
            await prisma.documentChunk.update({
                where: { id: chunkId },
                data: { content }
            });
        }

        // Resolve conflicts associated with this chunk
        await prisma.knowledgeConflict.updateMany({
            where: {
                agentId: agentId,
                status: "NEW",
                details: {
                    path: ['chunks_involved'],
                    array_contains: [{ chunk_id: chunkId }]
                }
            },
            data: {
                status: "RESOLVED",
                resolvedAt: new Date()
            }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Update chunk error:", error);
        return NextResponse.json({ error: "Failed to update chunk" }, { status: 500 });
    }
}
