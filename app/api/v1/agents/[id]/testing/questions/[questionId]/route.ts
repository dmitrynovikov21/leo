import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

// PUT /api/v1/agents/[id]/testing/questions/[questionId]
export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string; questionId: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id, questionId } = await params;
        const body = await req.json();
        const { question, expectedAnswer } = body;

        if (!question || !expectedAnswer) {
            return NextResponse.json({ error: "Question and Expected Answer are required" }, { status: 400 });
        }

        const updated = await prisma.fileQaQuestion.update({
            where: {
                id: questionId,
                // Ensure ownership via agent or knowledge base logic if complex permissions needed,
                // but for now relying on API route structure and basic auth.
                // Ideally check that the question belongs to an agent owned by user.
            },
            data: {
                question,
                expectedAnswer
            }
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Error updating question:", error);
        return NextResponse.json({ error: "Failed to update question" }, { status: 500 });
    }
}

// DELETE /api/v1/agents/[id]/testing/questions/[questionId]
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string; questionId: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { questionId } = await params;

        await prisma.fileQaQuestion.delete({
            where: { id: questionId }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting question:", error);
        return NextResponse.json({ error: "Failed to delete question" }, { status: 500 });
    }
}
