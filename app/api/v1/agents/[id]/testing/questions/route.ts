import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

// GET /api/v1/agents/[agentId]/testing/questions
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
        const agentId = id;

        // Fetch questions linked to agent directly or via KnowledgeBase
        const questions = await prisma.fileQaQuestion.findMany({
            where: {
                OR: [
                    { agentId },
                    { knowledgeBase: { agentId } }
                ]
            },
            include: {
                libraryItem: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                knowledgeBase: {
                    select: {
                        id: true,
                        filename: true
                    }
                }
            },
            orderBy: { createdAt: "desc" }
        });

        // Transform to return unified structure
        const formattedQuestions = questions.map(q => ({
            ...q,
            libraryItem: q.libraryItem || (q.knowledgeBase ? { name: q.knowledgeBase.filename, id: q.knowledgeBase.id } : null)
        }));

        return NextResponse.json({ questions: formattedQuestions });

    } catch (error) {
        console.error("Error fetching questions:", error);
        return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 });
    }
}
