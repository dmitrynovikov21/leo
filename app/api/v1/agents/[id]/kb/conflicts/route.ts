import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

// GET /api/v1/agents/[id]/kb/conflicts
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: agentId } = await params;

        const conflicts = await prisma.knowledgeConflict.findMany({
            where: {
                agentId: agentId,
                status: "NEW"
            },
            orderBy: {
                detectedAt: 'desc'
            }
        });

        return NextResponse.json(conflicts);
    } catch (error) {
        console.error("Fetch conflicts error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
