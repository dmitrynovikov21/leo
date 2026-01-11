import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

// GET single agent
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
            include: {
                knowledgeBases: true,
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
        console.error("Error fetching agent:", error);
        return NextResponse.json(
            { error: "Failed to fetch agent" },
            { status: 500 }
        );
    }
}

// PATCH agent (update general info)
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
        const { name, description, avatarEmoji } = body;

        const updatedAgent = await prisma.agent.update({
            where: { id: params.id },
            data: {
                ...(name !== undefined && { name }),
                ...(description !== undefined && { description }),
                ...(avatarEmoji !== undefined && { avatarEmoji }),
            },
        });

        return NextResponse.json(updatedAgent);
    } catch (error) {
        console.error("Error updating agent:", error);
        return NextResponse.json(
            { error: "Failed to update agent" },
            { status: 500 }
        );
    }
}

// DELETE agent
export async function DELETE(
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

        // Delete agent (cascade will handle related records)
        await prisma.agent.delete({
            where: { id: params.id },
        });

        return NextResponse.json({ success: true, message: "Agent deleted" });
    } catch (error) {
        console.error("Error deleting agent:", error);
        return NextResponse.json(
            { error: "Failed to delete agent" },
            { status: 500 }
        );
    }
}
