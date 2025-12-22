"use client"

import { Settings, Bot } from "lucide-react"
import { Link } from "@/i18n/routing"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface Agent {
    id: string
    name: string
    role: string
    description: string
    status: 'STOPPED' | 'STARTING' | 'RUNNING' | 'ERROR'
    createdAt: string
}

interface AgentCardProps {
    agent: Agent
}

export function AgentCard({ agent }: AgentCardProps) {
    const t = useTranslations('Agents')

    // Status badge configuration
    const getStatusConfig = () => {
        switch (agent.status) {
            case 'RUNNING':
                return {
                    label: t('online'),
                    className: "bg-green-500/10 text-green-600 border-green-200"
                }
            case 'STARTING':
                return {
                    label: t('starting'),
                    className: "bg-yellow-500/10 text-yellow-600 border-yellow-200"
                }
            case 'STOPPED':
                return {
                    label: t('paused'),
                    className: "bg-slate-500/10 text-slate-600 border-slate-200"
                }
            case 'ERROR':
                return {
                    label: 'Error',
                    className: "bg-red-500/10 text-red-600 border-red-200"
                }
            default:
                return {
                    label: 'Unknown',
                    className: "bg-slate-500/10 text-slate-600 border-slate-200"
                }
        }
    }

    const statusConfig = getStatusConfig()

    // Get initials from name
    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)
    }

    return (
        <Link href={`/dashboard/agents/${agent.id}`} className="block h-full">
            <Card className="group hover:border-primary/50 transition-all bg-white h-full flex flex-col cursor-pointer rounded-2xl border-zinc-200/50 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                {/* Header */}
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <Bot className="h-6 w-6 text-primary" />
                        </div>
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

                {/* Body - Description */}
                <CardContent className="py-3 flex-1">
                    <p className="text-sm text-muted-foreground line-clamp-3">
                        {agent.description}
                    </p>
                </CardContent>

                {/* Footer */}
                <CardFooter className="pt-3 pb-3 gap-2 border-t border-zinc-100 flex items-center justify-between mt-auto">
                    <span className="text-xs text-muted-foreground">
                        Создан: {new Date(agent.createdAt).toLocaleDateString('ru-RU')}
                    </span>
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
