"use client"

import Link from "next/link"
import { usePathname, useParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { Bot, LineChart, MessageSquare, Settings, Sparkles, Wifi, AlertTriangle } from "lucide-react"
import { EmojiAvatar } from "@/components/shared/emoji-avatar"
import { useUserData } from "@/components/providers/user-data-provider"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface AgentLayoutProps {
    children: React.ReactNode
}

export default function AgentLayout({ children }: AgentLayoutProps) {
    const { agents } = useUserData()
    const t = useTranslations('Agents.detail');
    const tCommon = useTranslations('Agents');
    const pathname = usePathname()
    const params = useParams()
    const agentId = params.agentId as string
    const locale = params.locale as string

    // Find current agent
    const agent = agents.find(a => a.id === agentId)
    const isRunning = agent?.status === 'RUNNING'

    // Ensure we are in the correct dashboard path context
    const baseUrl = `/${locale}/dashboard/agents/${agentId}`

    const tabs = [
        {
            title: t('overview'),
            href: baseUrl,
            icon: LineChart,
            exact: true,
        },
        {
            title: t('behavior'),
            href: `${baseUrl}/behavior`,
            icon: Sparkles,
            exact: false,
        },
        {
            title: t('sources'),
            href: `${baseUrl}/sources`,
            icon: Wifi,
            exact: false,
        },
        {
            title: t('knowledge'),
            href: `${baseUrl}/knowledge`,
            icon: Bot,
            exact: false,
        },
        {
            title: t('conflicts'),
            href: `${baseUrl}/conflicts`,
            icon: AlertTriangle,
            exact: false,
        },
        {
            title: t('testing'),
            href: `${baseUrl}/test`,
            icon: MessageSquare,
            exact: false,
        },
        {
            title: t('settings'),
            href: `${baseUrl}/settings`,
            icon: Settings,
            exact: false,
        },
    ]

    return (
        <div className="flex h-full flex-col">
            {/* Agent Context Header */}
            <div className="flex items-center justify-between border-b border-zinc-200/50 px-6 py-3">
                <div className="flex items-center gap-4">
                    {/* Emoji Avatar */}
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl">
                        <EmojiAvatar
                            value={agent?.role === 'system' ? "🤖" : "🧙‍♂️"}
                            size="lg"
                            className="text-3xl"
                        />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold tracking-tight">{agent?.name || 'Loading...'}</h2>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className={`flex h-1.5 w-1.5 rounded-full ${isRunning ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                            {agent ? (
                                agent.status === 'STARTING' ? tCommon('starting') :
                                    agent.status === 'RUNNING' ? tCommon('online') :
                                        agent.status === 'STOPPED' ? tCommon('paused') : agent.status
                            ) : '...'}
                            <span>•</span>
                            <span>v1.0</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Button removed as per request */}
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex items-center border-b border-zinc-200/50 px-6 bg-white">
                <nav className="flex items-center gap-4">
                    {tabs.map((tab) => {
                        const isActive = tab.exact
                            ? pathname === tab.href || pathname === tab.href + '/'
                            : pathname.startsWith(tab.href)

                        return (
                            <Link
                                key={tab.href}
                                href={tab.href}
                                className={cn(
                                    "flex items-center gap-2 border-b-2 py-3 text-sm font-medium transition-colors hover:text-primary",
                                    isActive
                                        ? "border-primary text-primary"
                                        : "border-transparent text-muted-foreground"
                                )}
                            >
                                <tab.icon className="h-4 w-4" />
                                {tab.title}
                            </Link>
                        )
                    })}
                </nav>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-6">
                {children}
            </div>
        </div>
    )
}
