import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { aiFetch, getGatewayUrl } from "@/lib/ai-fetch";

// GET /api/v1/conflicts - List all conflicts for current user
export async function GET(req: Request) {
    try {
        const session = await auth();
        // Allow API access with valid API Key in future, for now rely on session
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const statusParam = searchParams.get("status"); // "new", "resolved", "ignored"
        const agentId = searchParams.get("agentId");

        let statusFilter: "NEW" | "RESOLVED" | "IGNORED" | undefined;
        if (statusParam) {
            const upperStatus = statusParam.toUpperCase();
            if (["NEW", "RESOLVED", "IGNORED"].includes(upperStatus)) {
                statusFilter = upperStatus as "NEW" | "RESOLVED" | "IGNORED";
            } else {
                // Warn but don't crash, or ignore
                console.warn(`[API Conflicts] Invalid status param: ${statusParam}`);
            }
        }

        console.log(`[API Conflicts] Fetching for userId=${session.user.id}, agentId=${agentId}, status=${statusFilter}`);

        const conflicts = await prisma.knowledgeConflict.findMany({
            where: {
                userId: session.user.id,
                ...(statusFilter && { status: statusFilter }),
                ...(agentId && { agentId }),
            },
            orderBy: { detectedAt: "desc" },
        });

        // Transform response to match spec (lowercase status)
        const formattedConflicts = conflicts.map(c => ({
            ...c,
            status: c.status.toLowerCase(),
            // Map details if needed, currently storing as JSON
            // Assuming specs says 'details' in response contains the files
        }));

        return NextResponse.json({ conflicts: formattedConflicts });
    } catch (error) {
        console.error("Error fetching conflicts:", error);
        return NextResponse.json({ error: "Failed to fetch conflicts" }, { status: 500 });
    }
}

// POST /api/v1/conflicts - Log new conflict
export async function POST(req: Request) {
    try {
        const body = await req.json();
        /*
          Spec request:
          {
            "agentId": "agent_123",
            "chatId": "chat_456",
            "topic": "Цена услуги",
            "conflictingFiles": [
                { "file_name": "A.pdf", "value_found": "100" }
            ]
          }
        */
        const { agentId, chatId, topic, conflictingFiles } = body;

        if (!agentId || !topic || !conflictingFiles) {
            return NextResponse.json(
                { error: "agentId, topic, and conflictingFiles are required" },
                { status: 400 }
            );
        }

        // Find owner of the agent to associate conflict
        const agent = await prisma.agent.findUnique({
            where: { id: agentId },
            select: { userId: true }
        });

        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        // Enhance conflictingFiles with file_id if missing
        const enhancedFiles = await Promise.all(conflictingFiles.map(async (file: any) => {
            if (!file.file_id && file.file_name) {
                // Try to find the file in user's library
                const libraryItem = await prisma.libraryItem.findFirst({
                    where: {
                        userId: agent.userId,
                        name: file.file_name // Exact match on name
                    },
                    select: { id: true }
                });

                if (libraryItem) {
                    return { ...file, file_id: libraryItem.id };
                }

                // If not found in library, try agent documents via Gateway
                try {
                    const gatewayUrl = getGatewayUrl();
                    if (gatewayUrl) {
                        const response = await aiFetch(
                            `${gatewayUrl}/api/v1/agents/${agentId}/documents?filename=${encodeURIComponent(file.file_name)}`,
                            { headers: { 'Pragma': 'no-cache' } }
                        );

                        if (response.ok) {
                            const docs = await response.json();
                            const matchingDoc = docs.find((d: any) =>
                                (d.filename || d.name) === file.file_name
                            );

                            if (matchingDoc) {
                                return { ...file, file_id: matchingDoc.id };
                            }
                        }
                    }
                } catch (err) {
                    console.warn('Failed to search agent documents:', err);
                }
            }
            return file;
        }));

        const conflict = await prisma.knowledgeConflict.create({
            data: {
                userId: agent.userId,
                agentId,
                chatId,
                topic,
                details: enhancedFiles,
                status: "NEW",
            },
        });

        return NextResponse.json({
            success: true,
            id: conflict.id,
            message: "Conflict logged successfully"
        });
    } catch (error) {
        console.error("Error logging conflict:", error);
        return NextResponse.json({ error: "Failed to log conflict" }, { status: 500 });
    }
}

