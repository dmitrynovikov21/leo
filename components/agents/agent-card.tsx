"use client"

import { Play, Settings, MessageSquare, Bot } from "lucide-react"
import { EmojiAvatar } from "@/components/shared/emoji-avatar"
import { Link } from "@/i18n/routing"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChannelIcon } from "@/components/agents/channel-icon"
import { cn } from "@/lib/utils"

// Database Agent type (from Prisma)
interface DbAgent {
    id: string
    name: string
    role: string
    description: string
    status: 'STOPPED' | 'STARTING' | 'RUNNING' | 'ERROR'
    avatarEmoji?: string | null
    telegramToken?: string | null
    createdAt: string
    // Statistics (computed or joined)
    totalDialogs?: number
    dialogsToday?: number
}

interface AgentCardProps {
    agent: DbAgent
}

// Map DB status to UI status
function mapStatus(dbStatus: DbAgent['status']): 'active' | 'training' | 'paused' | 'error' {
    switch (dbStatus) {
        case 'RUNNING': return 'active'
        case 'STARTING': return 'training'
        case 'STOPPED': return 'paused'
        case 'ERROR': return 'error'
        default: return 'paused'
    }
}

export function AgentCard({ agent }: AgentCardProps) {
    const t = useTranslations('Agents')

    // Adapt DB data to component format
    const uiStatus = mapStatus(agent.status)
    const avatar = agent.avatarEmoji || undefined
    const metrics = {
        totalDialogs: agent.totalDialogs || 0,
        dialogsToday: agent.dialogsToday || 0,
        connectedChannels: {
            telegram: !!agent.telegramToken,
            whatsapp: false, // Not in current schema
            instagram: false,
            facebook: false,
            web: false,
        }
    }

    // Status badge configuration
    const getStatusConfig = () => {
        switch (uiStatus) {
            case 'active':
                return {
                    label: t('online'),
                    className: "bg-green-500/10 text-green-600 border-green-200"
                }
            case 'training':
                return {
                    label: t('training'),
                    className: "bg-yellow-500/10 text-yellow-600 border-yellow-200"
                }
            case 'paused':
                return {
                    label: t('paused'),
                    className: "bg-slate-500/10 text-slate-600 border-slate-200"
                }
            case 'error':
                return {
                    label: 'Error',
                    className: "bg-red-500/10 text-red-600 border-red-200"
                }
        }
    }

    const statusConfig = getStatusConfig()

    return (
        <Link href={`/dashboard/agents/${agent.id}`} className="block h-full">
            <Card className="group hover:border-primary/50 transition-all bg-white h-full flex flex-col cursor-pointer rounded-2xl border-zinc-200/50 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                {/* A. Header (Top) */}
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <div className="flex items-center gap-3">
                        <EmojiAvatar
                            value={avatar}
                            fallbackIcon={Bot}
                            className="h-12 w-12 text-2xl"
                        />
                        <div className="flex flex-col">
                            <span className="font-semibold text-sm leading-none group-hover:text-primary transition-colors">
                                {agent.name}
                            </span>
                            <span className="text-xs text-muted-foreground mt-1">{agent.role}</span>
                        </div>
                    </div>
                    <Badge
                        variant="secondary"
                        className={cn(
                            "text-[10px] px-2 py-0.5 border font-medium rounded-sm",
                            statusConfig.className
                        )}
                    >
                        {statusConfig.label}
                    </Badge>
                </CardHeader>

                {/* B. Body (Middle) - Metrics */}
                <CardContent className="py-3 flex-1">
                    <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col gap-1 p-3 rounded-xl bg-zinc-50 border border-zinc-100/50 group-hover:bg-zinc-100 transition-colors">
                            <span className="text-[10px] uppercase text-zinc-400 font-bold tracking-wider flex items-center gap-1.5 truncate">
                                <MessageSquare size={12} /> {t('totalDialogs')}
                            </span>
                            <span className="text-xl font-bold text-zinc-900 tracking-tight">
                                {metrics.totalDialogs.toLocaleString('ru-RU')}
                            </span>
                        </div>
                        <div className="flex flex-col gap-1 p-3 rounded-xl bg-zinc-50 border border-zinc-100/50 group-hover:bg-zinc-100 transition-colors">
                            <span className="text-[10px] uppercase text-zinc-400 font-bold tracking-wider flex items-center gap-1.5 truncate">
                                <MessageSquare size={12} className="opacity-50" /> Сегодня
                            </span>
                            <span className="text-xl font-bold text-zinc-900 tracking-tight">
                                {metrics.dialogsToday.toLocaleString('ru-RU')}
                            </span>
                        </div>
                    </div>
                </CardContent>

                {/* C. Footer (Bottom) - Channels + Manage */}
                <CardFooter className="pt-3 pb-3 gap-2 border-t border-zinc-100 flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                        {metrics.connectedChannels.whatsapp && <ChannelIcon type="whatsapp" active={true} />}
                        {metrics.connectedChannels.telegram && <ChannelIcon type="telegram" active={true} />}
                        {metrics.connectedChannels.instagram && <ChannelIcon type="instagram" active={true} />}
                        {metrics.connectedChannels.facebook && <ChannelIcon type="facebook" active={true} />}
                        {metrics.connectedChannels.web && <ChannelIcon type="web" active={true} />}
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-8 px-4 rounded-xl hover:bg-zinc-100 text-zinc-600 group-hover:text-zinc-900"
                    >
                        <Settings size={14} className="mr-1.5" />
                        {t('manage')}
                    </Button>
                </CardFooter>
            </Card>
        </Link>
    )
}
