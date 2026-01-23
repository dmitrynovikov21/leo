import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

// GET /api/conflicts/[id] - Get single conflict
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        const conflict = await prisma.knowledgeConflict.findFirst({
            where: {
                id,
                userId: session.user.id,
            },
        });

        if (!conflict) {
            return NextResponse.json({ error: "Conflict not found" }, { status: 404 });
        }

        return NextResponse.json(conflict);
    } catch (error) {
        console.error("Error fetching conflict:", error);
        return NextResponse.json({ error: "Failed to fetch conflict" }, { status: 500 });
    }
}

// PATCH /api/conflicts/[id] - Update conflict status
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await req.json();
        const { status: rawStatus } = body;
        const status = rawStatus?.toUpperCase();

        if (!status || !["NEW", "RESOLVED", "IGNORED"].includes(status)) {
            return NextResponse.json(
                { error: "Invalid status. Must be new, resolved, or ignored" },
                { status: 400 }
            );
        }

        // Verify ownership
        const existing = await prisma.knowledgeConflict.findFirst({
            where: { id, userId: session.user.id },
        });

        if (!existing) {
            return NextResponse.json({ error: "Conflict not found" }, { status: 404 });
        }

        const conflict = await prisma.knowledgeConflict.update({
            where: { id },
            data: {
                status,
                resolvedAt: status === "RESOLVED" ? new Date() : null,
            },
        });

        return NextResponse.json({ success: true, conflict });
    } catch (error) {
        console.error("Error updating conflict:", error);
        return NextResponse.json({ error: "Failed to update conflict" }, { status: 500 });
    }
}

// DELETE /api/conflicts/[id] - Delete conflict
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        // Verify ownership
        const existing = await prisma.knowledgeConflict.findFirst({
            where: { id, userId: session.user.id },
        });

        if (!existing) {
            return NextResponse.json({ error: "Conflict not found" }, { status: 404 });
        }

        await prisma.knowledgeConflict.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting conflict:", error);
        return NextResponse.json({ error: "Failed to delete conflict" }, { status: 500 });
    }
}
