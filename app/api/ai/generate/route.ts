import { NextResponse } from "next/server";
import { auth } from "@/auth";

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

        // Server-side URL (for Docker: use host.docker.internal)
        // Falls back to NEXT_PUBLIC_ for local dev without Docker
        const gatewayUrl = process.env.AI_GATEWAY_URL || process.env.NEXT_PUBLIC_AI_GATEWAY_URL;

        if (!gatewayUrl) {
            console.error("Gateway URL is not defined");
            // Return mock/error or just error
            return NextResponse.json({ error: "Service Configuration Error" }, { status: 500 });
        }

        console.log(`[Proxy] Forwarding generation request to ${gatewayUrl}/api/v1/generate-agent-prompt`);

        const response = await fetch(`${gatewayUrl}/api/v1/generate-agent-prompt`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Gateway error: ${response.status} ${errorText}`);
            return NextResponse.json(
                { error: "Failed to generate prompt upstream" },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error("Error generating prompt:", error);
        return NextResponse.json(
            { error: "Failed to generate prompt" },
            { status: 500 }
        );
    }
}
