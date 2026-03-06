import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { aiFetch, getOrchestratorUrl } from "@/lib/ai-fetch"

export async function GET(req: NextRequest) {
    try {
        const session = await auth()

        if (!session || !session.user) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const userId = session.user.id
        const orchestratorUrl = getOrchestratorUrl()



        if (!orchestratorUrl) {
            console.error("Orchestrator URL is not defined")
            return new NextResponse("Service Configuration Error", { status: 500 })
        }

        const res = await aiFetch(`${orchestratorUrl}/api/v1/agents/stats/history`, {
            headers: {
                "x-user-id": userId || "",
                "Content-Type": "application/json"
            }
        })

        if (!res.ok) {
            console.error(`Orchestrator error: ${res.status} ${res.statusText}`)
            return new NextResponse("Upstream Error", { status: res.status })
        }

        const data = await res.json()
        return NextResponse.json(data)

    } catch (error) {
        console.error("[GLOBAL_STATS_HISTORY_GET]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
