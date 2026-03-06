import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { aiFetch, getOrchestratorUrl } from "@/lib/ai-fetch"

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth()

        if (!session || !session.user) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const agentId = params.id
        const orchestratorUrl = getOrchestratorUrl()

        if (!orchestratorUrl) {
            return new NextResponse("Orchestrator URL not configured", { status: 500 })
        }

        // Proxy request to orchestrator
        const response = await aiFetch(`${orchestratorUrl}/api/v1/agents/${agentId}/stats`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        })

        if (!response.ok) {
            return new NextResponse(`Orchestrator error: ${response.status}`, { status: response.status })
        }

        const data = await response.json()
        return NextResponse.json(data)

    } catch (error) {
        console.error("[AGENT_STATS_GET]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
