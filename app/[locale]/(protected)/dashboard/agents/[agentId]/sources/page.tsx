"use client"


import * as React from "react"
import { useTranslations } from "next-intl"
import { Send, Phone, MessageSquare, MessageCircle, ArrowRight, CheckCircle2, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { TelegramConnectionDialog } from "@/components/agents/telegram-connection-dialog"
import { useUserData } from "@/components/providers/user-data-provider"

interface SourceCard {
    id: string
    title: string
    description: string
    icon: React.ElementType
    status: 'active' | 'coming_soon' | 'beta'
    connected?: boolean
    color: string
}

export default function SourcesPage() {
    const t = useTranslations('Agents')
    const { agents } = useUserData()
    const params = useParams()
    const agentId = params?.agentId as string

    // Find current agent
    const agent = agents.find(a => a.id === agentId)
    const isTelegramConnected = !!agent?.isTelegramConnected || !!agent?.telegramToken

    const SOURCES: SourceCard[] = [
        {
            id: 'telegram',
            title: 'Telegram Бот',
            description: 'Подключите своего агента к Telegram-боту для автоматической обработки запросов поддержки.',
            icon: Send,
            status: 'active',
            connected: isTelegramConnected,
            color: 'text-sky-500' // Telegram blue-ish
        },
        {
            id: 'whatsapp',
            title: 'WhatsApp Business',
            description: 'Общайтесь с клиентами в самом популярном мессенджере через официальный Business API.',
            icon: Phone,
            status: 'coming_soon',
            color: 'text-green-500'
        },
        {
            id: 'bitrix',
            title: 'Bitrix24',
            description: 'Интеграция с вашей CRM для логирования диалогов и управления сделками прямо из чата.',
            icon: MessageSquare,
            status: 'coming_soon',
            color: 'text-blue-600'
        },
        {
            id: 'jivo',
            title: 'JivoChat',
            description: 'Встройте AI-агента в виджет на сайте для ответов на вопросы посетителей 24/7.',
            icon: MessageCircle,
            status: 'coming_soon',
            color: 'text-orange-500'
        }
    ]

    return (
        <div className="space-y-6 max-w-5xl">
            {/* Page Header */}
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Источники коммуникации</h2>
                <p className="text-muted-foreground mt-1">
                    Подключите агента к платформам, где находятся ваши клиенты.
                </p>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {SOURCES.map((source) => {
                    const CardComponent = (
                        <Card
                            key={source.id}
                            className={cn(
                                "group flex flex-col h-full transition-all duration-300 border-zinc-200/50 shadow-sm rounded-2xl bg-white overflow-hidden relative",
                                source.status === 'active'
                                    ? "hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-zinc-300 hover:-translate-y-1"
                                    : "opacity-80"
                            )}
                        >
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-4 mb-2">
                                    <div className={cn(
                                        "h-8 w-8 rounded-xl flex items-center justify-center transition-colors shrink-0",
                                        "bg-white border border-zinc-100 group-hover:bg-white group-hover:shadow-sm"
                                    )}>
                                        <source.icon className={cn("h-4 w-4", source.color)} />
                                    </div>
                                    <CardTitle className="text-lg font-bold text-zinc-900 leading-tight">
                                        {source.title}
                                    </CardTitle>
                                </div>
                                <CardDescription className="text-sm text-zinc-500 leading-relaxed">
                                    {source.description}
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="flex-1">
                            </CardContent>

                            <CardFooter className="pt-0 pb-6">
                                {source.status === 'active' ? (
                                    source.connected ? (
                                        <Button
                                            className="w-full rounded-xl h-10 font-medium shadow-none bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-900"
                                            variant="secondary"
                                        >
                                            <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                                            Настроить
                                        </Button>
                                    ) : (
                                        <Button
                                            className="w-full rounded-xl h-10 font-medium shadow-none"
                                            variant="default"
                                        >
                                            Подключить <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    )
                                ) : (
                                    <div className="w-full h-10" /> // Spacer
                                )}
                            </CardFooter>

                            {/* Premium Overlay for Coming Soon */}
                            {source.status === 'coming_soon' && (
                                <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[2px] z-10 transition-all duration-500">
                                    <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white/90 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 ring-1 ring-black/5 mx-6 transform transition-transform group-hover:scale-105">
                                        <div className="text-center space-y-1">
                                            <h4 className="text-sm font-bold text-zinc-900 tracking-tight">Скоро</h4>
                                            <p className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400">В разработке</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </Card>
                    )

                    if (source.id === 'telegram') {
                        return (
                            <TelegramConnectionDialog
                                key={source.id}
                                agentId={agentId}
                                initialToken={agent?.telegramToken}
                            >
                                {CardComponent}
                            </TelegramConnectionDialog>
                        )
                    }

                    return CardComponent
                })}
            </div>
        </div>
    )
}
