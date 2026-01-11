import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard"

export default function AgentOverviewPage({ params }: { params: { agentId: string } }) {
    return (
        <AnalyticsDashboard agentId={params.agentId} />
    )
}
