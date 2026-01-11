import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

// PATCH /api/agents/[id]/behavior - Update agent behavior settings
export async function PATCH(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Verify ownership
        const existingAgent = await prisma.agent.findFirst({
            where: {
                id: params.id,
                userId: session.user.id,
            },
        });

        if (!existingAgent) {
            return NextResponse.json(
                { error: "Agent not found" },
                { status: 404 }
            );
        }

        const body = await req.json();
        const { displayName, temperature, debounceMs, tone, guardrails, welcomeMessage } = body;

        // Validate debounceMs range (500ms to 30000ms)
        if (debounceMs !== undefined) {
            if (typeof debounceMs !== 'number' || debounceMs < 1000 || debounceMs > 30000) {
                return NextResponse.json(
                    { error: "debounceMs must be a number between 1000 and 30000" },
                    { status: 400 }
                );
            }
        }

        // Validate temperature range (0 to 1)
        if (temperature !== undefined) {
            if (typeof temperature !== 'number' || temperature < 0 || temperature > 1) {
                return NextResponse.json(
                    { error: "temperature must be a number between 0 and 1" },
                    { status: 400 }
                );
            }
        }

        const updatedAgent = await prisma.agent.update({
            where: { id: params.id },
            data: {
                ...(displayName !== undefined && { displayName }),
                ...(temperature !== undefined && { temperature }),
                ...(debounceMs !== undefined && { debounceMs }),
                ...(tone !== undefined && { tone }),
                ...(guardrails !== undefined && { guardrails }),
                ...(welcomeMessage !== undefined && { welcomeMessage }),
            },
            select: {
                displayName: true,
                temperature: true,
                debounceMs: true,
                tone: true,
                guardrails: true,
                welcomeMessage: true,
            },
        });

        return NextResponse.json(updatedAgent);
    } catch (error) {
        console.error("Error updating agent behavior:", error);
        return NextResponse.json(
            { error: "Failed to update agent behavior" },
            { status: 500 }
        );
    }
}

// GET /api/agents/[id]/behavior - Get agent behavior settings
export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const agent = await prisma.agent.findFirst({
            where: {
                id: params.id,
                userId: session.user.id,
            },
            select: {
                displayName: true,
                temperature: true,
                debounceMs: true,
                tone: true,
                guardrails: true,
                welcomeMessage: true,
            },
        });

        if (!agent) {
            return NextResponse.json(
                { error: "Agent not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(agent);
    } catch (error) {
        console.error("Error fetching agent behavior:", error);
        return NextResponse.json(
            { error: "Failed to fetch agent behavior" },
            { status: 500 }
        );
    }
}
