import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

// DELETE /api/user/sessions/[id] - Delete specific session
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

        // Verify the session belongs to the user
        const targetSession = await prisma.session.findFirst({
            where: {
                id: params.id,
                userId: session.user.id,
            }
        });

        if (!targetSession) {
            return NextResponse.json(
                { error: "Session not found" },
                { status: 404 }
            );
        }

        await prisma.session.delete({
            where: { id: params.id }
        });

        return NextResponse.json({
            success: true,
            message: "Session terminated"
        });
    } catch (error) {
        console.error("Error deleting session:", error);
        return NextResponse.json(
            { error: "Failed to delete session" },
            { status: 500 }
        );
    }
}
