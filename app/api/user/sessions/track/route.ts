import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";

// POST /api/user/sessions/track - Create or update session tracking
export async function POST() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const headersList = headers();
        const userAgent = headersList.get("user-agent") || null;
        const forwardedFor = headersList.get("x-forwarded-for");
        const ipAddress = forwardedFor?.split(",")[0]?.trim() || headersList.get("x-real-ip") || null;

        // Check if user already has an active session from this user agent
        const existingSession = await prisma.userSession.findFirst({
            where: {
                userId: session.user.id,
                userAgent: userAgent,
                isRevoked: false,
                expiresAt: { gt: new Date() }
            }
        });

        if (existingSession) {
            // Update existing session
            await prisma.userSession.update({
                where: { id: existingSession.id },
                data: {
                    lastActivity: new Date(),
                    ipAddress: ipAddress
                }
            });

            return NextResponse.json({
                sessionId: existingSession.id,
                created: false
            });
        }

        // Create new session
        const newSession = await prisma.userSession.create({
            data: {
                userId: session.user.id,
                jti: crypto.randomUUID(),
                userAgent,
                ipAddress,
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            }
        });

        return NextResponse.json({
            sessionId: newSession.id,
            created: true
        });
    } catch (error) {
        console.error("Error tracking session:", error);
        return NextResponse.json(
            { error: "Failed to track session" },
            { status: 500 }
        );
    }
}
