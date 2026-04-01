"use client"

import { Bot, Plus, Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useRouter, useParams } from "next/navigation"
import { useState, useRef } from "react"

import { AgentCard } from "@/components/agents/agent-card"
import { useUser } from "@/components/providers/user-data-provider"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"

export default function AgentsPage() {
    const t = useTranslations('Agents');
    const { agents, isLoading, refreshAgents } = useUser()
    const router = useRouter()
    const params = useParams()
    const locale = params.locale as string
    const [creating, setCreating] = useState(false)
    const creatingRef = useRef(false)

    const hasAgents = agents.filter(a => a.status !== 'DRAFT').length > 0

    const handleCreateAgent = async () => {
        // Guard against double-click / double-render
        if (creatingRef.current) return
        creatingRef.current = true
        setCreating(true)
        try {
            const res = await fetch("/api/agents", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ draft: true }),
            })
            if (res.ok) {
                const agent = await res.json()
                // Don't refreshAgents or setCreating(false) — we're navigating away
                router.push(`/${locale}/dashboard/agents/${agent.id}/wizard`)
                return
            } else {
                console.error("Failed to create draft agent")
            }
        } catch (err) {
            console.error("Create agent error:", err)
        }
        creatingRef.current = false
        setCreating(false)
    }

    const createButton = (
        <Button size="lg" onClick={handleCreateAgent} disabled={creating} className="shadow-md hover:shadow-lg transition-all">
            {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            {t('hireNewAgent')}
        </Button>
    )

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
                {createButton}
            </div>

            {/* Agents Grid — filter out DRAFT agents */}
            {hasAgents ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {agents
                        .filter(a => a.status !== 'DRAFT')
                        .map((agent) => (
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
                        {createButton}
                    </div>
                </div>
            )}
        </div>
    )
}
