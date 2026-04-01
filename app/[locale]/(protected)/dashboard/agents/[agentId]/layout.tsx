"use client"

import { useEffect } from "react"
import Link from "next/link"
import { usePathname, useParams, useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Bot, LineChart, MessageSquare, Settings, Sparkles, Wifi, AlertTriangle, Wand2 } from "lucide-react"
import { EmojiAvatar } from "@/components/shared/emoji-avatar"
import { useUserData } from "@/components/providers/user-data-provider"

import { cn } from "@/lib/utils"

interface AgentLayoutProps {
    children: React.ReactNode
}

export default function AgentLayout({ children }: AgentLayoutProps) {
    const { agents, isLoading } = useUserData()
    const t = useTranslations('Agents.detail');
    const tCommon = useTranslations('Agents');
    const pathname = usePathname()
    const params = useParams()
    const router = useRouter()
    const agentId = params.agentId as string
    const locale = params.locale as string

    const agent = agents.find(a => a.id === agentId)
    const isOnWizard = pathname.includes('/wizard')
    // Only treat as DRAFT if agents are loaded and agent is actually DRAFT
    // While loading, if we're on wizard page — assume DRAFT to avoid tab flash
    const isDraft = isLoading ? isOnWizard : (agent?.status === 'DRAFT')
    const isRunning = agent?.status === 'RUNNING'

    const baseUrl = `/${locale}/dashboard/agents/${agentId}`

    // Redirect DRAFT agents to wizard if they navigate away
    useEffect(() => {
        if (!isLoading && agent?.status === 'DRAFT' && !isOnWizard) {
            router.replace(`${baseUrl}/wizard`)
        }
    }, [isLoading, agent, isOnWizard, baseUrl, router])

    const allTabs = [
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

    const wizardTab = {
        title: "Настройка",
        href: `${baseUrl}/wizard`,
        icon: Wand2,
        exact: false,
    }

    // DRAFT agents: show only wizard tab
    const tabs = isDraft ? [wizardTab] : allTabs

    const statusLabel = agent
        ? agent.status === 'DRAFT' ? 'Черновик'
        : agent.status === 'STARTING' ? tCommon('starting')
        : agent.status === 'RUNNING' ? tCommon('online')
        : agent.status === 'STOPPED' ? tCommon('paused')
        : agent.status
        : '...'

    const statusColor = isDraft ? 'bg-amber-400' : isRunning ? 'bg-emerald-500' : 'bg-zinc-400'

    return (
        <div className="flex h-full flex-col">
            {/* Agent Context Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-3">
                <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl">
                        <EmojiAvatar
                            value={agent?.avatarEmoji || "🤖"}
                            size="lg"
                            className="text-3xl"
                        />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold tracking-tight">{agent?.name || 'Новый агент'}</h2>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className={`flex h-1.5 w-1.5 rounded-full ${statusColor}`} />
                            {statusLabel}
                            {!isDraft && (
                                <>
                                    <span>•</span>
                                    <span>v1.0</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex items-center border-b border-border px-6 bg-card">
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
