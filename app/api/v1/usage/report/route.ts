import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { trackTokenUsage } from "@/lib/token-tracking";

// POST /api/v1/usage/report
export async function POST(req: Request) {
    try {
        // 1. Security Check
        const authHeader = req.headers.get("Authorization");
        const serviceKey = process.env.LEO_SERVICE_KEY;

        if (!serviceKey || authHeader !== `Bearer ${serviceKey}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { agentId, telegramUserId, model, promptTokens, completionTokens } = body;

        if (!agentId || !promptTokens || !completionTokens) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 2. Find Agent and Owner
        const agent = await prisma.agent.findUnique({
            where: { id: agentId },
            include: { user: true }
        });

        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        // 3. Track Usage & Deduct
        // We need to pass the OWNER'S userId
        await trackTokenUsage({
            userId: agent.user.id,
            agentId: agent.id,
            model: model || "gpt-unknown",
            promptTokens: Number(promptTokens),
            completionTokens: Number(completionTokens),
            responseTimeMs: 0, // Not provided
            isTest: false
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("[Usage Report] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
