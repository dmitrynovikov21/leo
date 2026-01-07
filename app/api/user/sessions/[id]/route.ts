import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

// DELETE /api/user/sessions/[id] - Revoke specific session
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
        const targetSession = await prisma.userSession.findFirst({
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

        // Revoke the session
        await prisma.userSession.update({
            where: { id: params.id },
            data: { isRevoked: true }
        });

        return NextResponse.json({
            success: true,
            message: "Session revoked"
        });
    } catch (error) {
        console.error("Error revoking session:", error);
        return NextResponse.json(
            { error: "Failed to revoke session" },
            { status: 500 }
        );
    }
}
