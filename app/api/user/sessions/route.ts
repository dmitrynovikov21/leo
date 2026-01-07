import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";

// GET /api/user/sessions - List all user sessions
export async function GET() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const sessions = await prisma.session.findMany({
            where: {
                userId: session.user.id,
                expires: { gt: new Date() } // Only active sessions
            },
            select: {
                id: true,
                userAgent: true,
                ipAddress: true,
                lastActivity: true,
                createdAt: true,
                expires: true,
            },
            orderBy: { lastActivity: 'desc' }
        });

        // Get current session token to mark it
        const headersList = headers();
        const currentSessionToken = headersList.get('x-session-token');

        const formattedSessions = sessions.map(s => ({
            ...s,
            isCurrent: false, // Will be determined by comparing tokens if needed
            device: parseUserAgent(s.userAgent),
        }));

        return NextResponse.json({ sessions: formattedSessions });
    } catch (error) {
        console.error("Error fetching sessions:", error);
        return NextResponse.json(
            { error: "Failed to fetch sessions" },
            { status: 500 }
        );
    }
}

// DELETE /api/user/sessions - Logout from all sessions
export async function DELETE(req: Request) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(req.url);
        const keepCurrent = searchParams.get('keepCurrent') === 'true';

        if (keepCurrent) {
            // Delete all sessions except current one
            // We need to get the current session token from cookie
            const headersList = headers();
            const cookies = headersList.get('cookie') || '';
            const sessionTokenMatch = cookies.match(/next-auth\.session-token=([^;]+)/);
            const currentToken = sessionTokenMatch?.[1];

            if (currentToken) {
                await prisma.session.deleteMany({
                    where: {
                        userId: session.user.id,
                        sessionToken: { not: currentToken }
                    }
                });
            } else {
                // If we can't find current token, delete all
                await prisma.session.deleteMany({
                    where: { userId: session.user.id }
                });
            }
        } else {
            // Delete ALL sessions (full logout)
            await prisma.session.deleteMany({
                where: { userId: session.user.id }
            });
        }

        return NextResponse.json({
            success: true,
            message: keepCurrent ? "Logged out from other devices" : "Logged out from all devices"
        });
    } catch (error) {
        console.error("Error deleting sessions:", error);
        return NextResponse.json(
            { error: "Failed to delete sessions" },
            { status: 500 }
        );
    }
}

// Helper function to parse user agent
function parseUserAgent(userAgent: string | null): { browser: string; os: string; device: string } {
    if (!userAgent) {
        return { browser: 'Unknown', os: 'Unknown', device: 'Unknown' };
    }

    let browser = 'Unknown';
    let os = 'Unknown';
    let device = 'Desktop';

    // Detect browser
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
        browser = 'Chrome';
    } else if (userAgent.includes('Firefox')) {
        browser = 'Firefox';
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
        browser = 'Safari';
    } else if (userAgent.includes('Edg')) {
        browser = 'Edge';
    } else if (userAgent.includes('Opera') || userAgent.includes('OPR')) {
        browser = 'Opera';
    }

    // Detect OS
    if (userAgent.includes('Windows')) {
        os = 'Windows';
    } else if (userAgent.includes('Mac OS')) {
        os = 'macOS';
    } else if (userAgent.includes('Linux')) {
        os = 'Linux';
    } else if (userAgent.includes('Android')) {
        os = 'Android';
        device = 'Mobile';
    } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
        os = 'iOS';
        device = userAgent.includes('iPad') ? 'Tablet' : 'Mobile';
    }

    return { browser, os, device };
}
