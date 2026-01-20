"use client"

import { AgentKnowledgeView } from "@/components/knowledge/agent-knowledge-view"

export default function KnowledgePage({ params }: { params: { agentId: string } }) {
    return <AgentKnowledgeView agentId={params.agentId} />
}
