import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { aiFetch, getOrchestratorUrl } from "@/lib/ai-fetch";

async function proxy(req: NextRequest, { params }: { params: { path: string[] } }) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orchestratorUrl = getOrchestratorUrl();
    if (!orchestratorUrl) {
        return NextResponse.json({ error: "Orchestrator not configured" }, { status: 503 });
    }

    const path = params.path.join("/");
    const url = new URL(`/api/v1/${path}`, orchestratorUrl);

    req.nextUrl.searchParams.forEach((value, key) => {
        url.searchParams.set(key, value);
    });

    const contentType = req.headers.get("Content-Type") || "";
    const headers: Record<string, string> = {};
    if (contentType) {
        headers["Content-Type"] = contentType;
    }

    const init: RequestInit = {
        method: req.method,
        headers,
    };

    if (req.method !== "GET" && req.method !== "HEAD") {
        init.body = await req.text();
    }

    const res = await aiFetch(url.toString(), init);

    if (res.status === 204) {
        return new NextResponse(null, { status: 204 });
    }

    const data = await res.text();

    return new NextResponse(data, {
        status: res.status,
        headers: { "Content-Type": res.headers.get("Content-Type") || "application/json" },
    });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
