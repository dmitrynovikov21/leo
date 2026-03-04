"use client"

import { Bot } from "lucide-react"
import { useTranslations } from "next-intl"

import { AgentWizardDialog } from "@/components/agents/agent-wizard-dialog"
import { AgentCard } from "@/components/agents/agent-card"
import { useUser } from "@/components/providers/user-data-provider"
import { Skeleton } from "@/components/ui/skeleton"

export default function AgentsPage() {
    const t = useTranslations('Agents');
    const { agents, isLoading } = useUser()

    const hasAgents = agents.length > 0

    if (isLoading) {
        return (
            <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-96" />
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-[200px] w-full rounded-xl" />
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-1 flex-col gap-6 p-6">

            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">{t('title')}</h1>
                    <p className="text-sm text-muted-foreground">
                        {t('description')}
                    </p>
                </div>
                <AgentWizardDialog />
            </div>

            {/* Agents Grid */}
            {hasAgents ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {agents.map((agent) => (
                        <AgentCard key={agent.id} agent={agent} />
                    ))}
                </div>
            ) : (
                /* Empty State */
                <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed shadow-sm">
                    <div className="flex flex-col items-center gap-6 text-center p-10">
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                            <Bot className="h-10 w-10 text-muted-foreground" />
                        </div>
                        <div className="max-w-md space-y-2">
                            <h3 className="text-xl font-bold">{t('noAgents')}</h3>
                            <p className="text-sm text-muted-foreground">
                                {t('noAgentsDesc')}
                            </p>
                        </div>
                        <AgentWizardDialog />
                    </div>
                </div>
            )}
        </div>
    )
}
