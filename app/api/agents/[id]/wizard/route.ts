import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

// PATCH — autosave wizard step data
export async function PATCH(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const agent = await prisma.agent.findFirst({
            where: { id: params.id, userId: session.user.id },
        });

        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        const body = await req.json();
        const { step, data } = body;

        if (typeof step !== "number" || !data) {
            return NextResponse.json({ error: "step (number) and data (object) required" }, { status: 400 });
        }

        // Merge new step data into existing wizardData
        const existingData = (agent.wizardData as Record<string, any>) || {};
        const updatedData = {
            ...existingData,
            currentStep: step,
            [`step${step}`]: {
                ...(existingData[`step${step}`] || {}),
                ...data,
            },
        };

        await prisma.agent.update({
            where: { id: params.id },
            data: {
                wizardData: updatedData,
                wizardStep: step,
            },
        });

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Wizard autosave error:", error);
        return NextResponse.json({ error: "Failed to save" }, { status: 500 });
    }
}

// GET — fetch wizard state
export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const agent = await prisma.agent.findFirst({
            where: { id: params.id, userId: session.user.id },
            select: { wizardData: true, wizardStep: true, status: true },
        });

        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        return NextResponse.json({
            wizardData: agent.wizardData || {},
            wizardStep: agent.wizardStep,
            status: agent.status,
        });
    } catch (error) {
        console.error("Wizard fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
    }
}
