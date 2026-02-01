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

        // 1. Update document chunk
        // Verify agent ownership implicitly via knowledge base relation if needed, 
        // but for now relying on auth + structure. 
        // Ideally: check if chunk belongs to agent owned by user.

        const updatedChunk = await prisma.documentChunk.update({
            where: { id: chunkId },
            data: { content }
        });

        // 2. Find and resolve conflicts associated with this chunk
        // The conflict details JSON contains "chunks_involved" array with "chunk_id".
        // We need to find conflicts where details->'chunks_involved' contains this chunkId.
        // Prisma JSON filtering can be tricky.
        // Postgres: details->'chunks_involved' @> '[{"chunk_id": "..."}]'

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

        return NextResponse.json({ success: true, chunk: updatedChunk });

    } catch (error) {
        console.error("Update chunk error:", error);
        return NextResponse.json({ error: "Failed to update chunk" }, { status: 500 });
    }
}
