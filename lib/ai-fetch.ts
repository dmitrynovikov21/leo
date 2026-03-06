/**
 * Authenticated fetch wrapper for ai-master services (server-side only).
 * Adds x-api-secret header when AI_API_SECRET is configured.
 *
 * Usage:
 *   import { aiFetch, getGatewayUrl, getOrchestratorUrl } from '@/lib/ai-fetch';
 *   const res = await aiFetch(`${getGatewayUrl()}/api/v1/documents/parse`, { method: 'POST', body });
 */

const AI_API_SECRET = process.env.AI_API_SECRET;

export function getGatewayUrl(): string {
    return (
        process.env.AI_GATEWAY_URL ||
        process.env.NEXT_PUBLIC_AI_GATEWAY_URL ||
        ''
    );
}

export function getOrchestratorUrl(): string {
    return (
        process.env.AGENT_ORCHESTRATOR_URL ||
        process.env.NEXT_PUBLIC_AGENT_ORCHESTRATOR_URL ||
        ''
    );
}

export function aiFetch(url: string, init?: RequestInit): Promise<Response> {
    const headers = new Headers(init?.headers);

    if (AI_API_SECRET) {
        headers.set('x-api-secret', AI_API_SECRET);
    }

    return fetch(url, { ...init, headers });
}
