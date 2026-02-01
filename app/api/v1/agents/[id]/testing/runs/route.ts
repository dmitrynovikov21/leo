import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

// GET /api/v1/agents/[agentId]/testing/runs
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

        const runs = await prisma.autoTestRun.findMany({
            where: {
                agentId,
                userId: session.user.id
            },
            include: {
                results: true
            },
            orderBy: {
                createdAt: "desc"
            },
            take: 20 // Limit history
        });

        return NextResponse.json(runs);
    } catch (error) {
        console.error("Error fetching run history:", error);
        return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
    }
}

// POST /api/v1/agents/[agentId]/testing/runs
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
        const body = await req.json();
        const { status, score, results } = body;

        const run = await prisma.autoTestRun.create({
            data: {
                agentId,
                userId: session.user.id,
                status,
                score,
                results: {
                    create: results.map((r: any) => ({
                        question: r.question,
                        expectedAnswer: r.expectedAnswer,
                        actualAnswer: r.actualAnswer,
                        passed: r.passed,
                        matchPercentage: r.matchPercentage
                    }))
                }
            },
            include: {
                results: true
            }
        });

        return NextResponse.json(run);
    } catch (error) {
        console.error("Error saving test run:", error);
        return NextResponse.json({ error: "Failed to save test run" }, { status: 500 });
    }
}
