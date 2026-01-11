import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const agents = await prisma.agent.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: "desc" },
            include: {
                knowledgeBases: true,
            },
        });

        return NextResponse.json(agents);
    } catch (error) {
        console.error("Error fetching agents:", error);
        return NextResponse.json(
            { error: "Failed to fetch agents" },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await req.json();
        const { name, role, description, systemPrompt, telegramToken } = body;

        if (!name || !role || !description) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        const agent = await prisma.agent.create({
            data: {
                userId: session.user.id,
                name,
                role,
                description,
                systemPrompt: systemPrompt || "",
                telegramToken,
            },
        });

        return NextResponse.json(agent, { status: 201 });
    } catch (error) {
        console.error("Error creating agent:", error);
        return NextResponse.json(
            { error: "Failed to create agent" },
            { status: 500 }
        );
    }
}
