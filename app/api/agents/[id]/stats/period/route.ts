import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { env } from "@/env.mjs"

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
        const searchParams = req.nextUrl.searchParams
        const fromParam = searchParams.get("from")
        const toParam = searchParams.get("to")

        if (!fromParam || !toParam) {
            return new NextResponse("Missing 'from' or 'to' query params", { status: 400 })
        }

        // Replace localhost with host.docker.internal for Docker networking
        const orchestratorUrl = env.NEXT_PUBLIC_AGENT_ORCHESTRATOR_URL?.replace("localhost", "host.docker.internal")



        if (!orchestratorUrl) {
            console.error("Orchestrator URL is not defined")
            return new NextResponse("Service Configuration Error", { status: 500 })
        }

        // Proxy request to orchestrator
        const upstreamUrl = `${orchestratorUrl}/api/v1/agents/${agentId}/stats/period?from=${fromParam}&to=${toParam}`
        console.log("[AGENT_STATS_PERIOD] Proxying to:", upstreamUrl)

        const res = await fetch(upstreamUrl, {
            headers: {
                "x-user-id": session.user.id || "",
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
        console.error("[AGENT_STATS_PERIOD_GET]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
