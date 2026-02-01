import { KnowledgeConflictsPage } from "@/components/knowledge/knowledge-conflicts-page"

export default function ConflictsPage({ params }: { params: { agentId: string } }) {
    return <KnowledgeConflictsPage agentId={params.agentId} />
}
