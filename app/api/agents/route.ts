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

        // DEV MODE: Return mock agents when database is unavailable
        if (process.env.NODE_ENV === 'development' && session.user.id === 'dev-user-id') {
            const mockAgents = [
                {
                    id: 'agent-1',
                    userId: 'dev-user-id',
                    name: 'Oleg HR',
                    role: 'Recruiting Assistant',
                    description: 'Помощник по подбору персонала',
                    status: 'RUNNING',
                    avatarEmoji: '🧑‍💼',
                    telegramToken: 'mock-telegram-token',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    totalDialogs: 1240,
                    dialogsToday: 45,
                    knowledgeBases: [],
                },
                {
                    id: 'agent-2',
                    userId: 'dev-user-id',
                    name: 'Support Bot',
                    role: 'Customer Support',
                    description: 'Бот поддержки клиентов',
                    status: 'STOPPED',
                    avatarEmoji: '🤖',
                    telegramToken: null,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    totalDialogs: 523,
                    dialogsToday: 0,
                    knowledgeBases: [],
                },
                {
                    id: 'agent-3',
                    userId: 'dev-user-id',
                    name: 'Sales Assistant',
                    role: 'Sales',
                    description: 'Помощник по продажам',
                    status: 'STARTING',
                    avatarEmoji: '💼',
                    telegramToken: 'mock-token-2',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    totalDialogs: 89,
                    dialogsToday: 12,
                    knowledgeBases: [],
                },
            ];
            return NextResponse.json(mockAgents);
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

        // Use URL from env directly (localhost:8081 works from host)
        const orchestratorUrl = process.env.NEXT_PUBLIC_AGENT_ORCHESTRATOR_URL;

        if (!orchestratorUrl) {
            console.error("Orchestrator URL is not defined");
            return NextResponse.json({ error: "Service Configuration Error" }, { status: 500 });
        }

        // Proxy to Orchestrator
        const response = await fetch(`${orchestratorUrl}/api/v1/agents`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': session.user.id
            },
            body: JSON.stringify({
                userId: session.user.id,
                ...body
            })
        });

        if (!response.ok) {
            console.error(`Orchestrator error: ${response.status} ${response.statusText}`);
            return NextResponse.json(
                { error: "Failed to create agent upstream" },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data, { status: 201 });
    } catch (error) {
        console.error("Error creating agent:", error);
        return NextResponse.json(
            { error: "Failed to create agent" },
            { status: 500 }
        );
    }
}
