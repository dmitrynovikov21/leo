"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Send, Phone, MessageSquare, MessageCircle, ArrowRight, CheckCircle2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface SourceCard {
    id: string
    title: string
    description: string
    icon: React.ElementType
    status: 'active' | 'coming_soon' | 'beta'
    connected?: boolean
    color: string
}

const SOURCES: SourceCard[] = [
    {
        id: 'telegram',
        title: 'Telegram Бот',
        description: 'Подключите своих агентов к Telegram-боту для автоматической обработки запросов поддержки.',
        icon: Send,
        status: 'active',
        connected: false, // Mock state
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
        description: 'Встройте AI-агентов в виджет на сайте для ответов на вопросы посетителей 24/7.',
        icon: MessageCircle,
        status: 'coming_soon',
        color: 'text-orange-500'
    }
]

export default function SourcesPage() {
    return (
        <div className="flex flex-1 flex-col gap-6 p-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Каналы коммуникации</h1>
                    <p className="text-sm text-muted-foreground">
                        Управление подключенными каналами для всех ваших агентов.
                    </p>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {SOURCES.map((source) => (
                    <Card
                        key={source.id}
                        className={cn(
                            "group flex flex-col h-full transition-all duration-200 border-border shadow-sm rounded-xl bg-card overflow-hidden",
                            source.status === 'active' ? "hover:shadow-md hover:border-border" : "opacity-70 bg-card grayscale-[0.5]"
                        )}
                    >
                        <CardHeader className="pb-3 p-4">
                            <div className="flex items-center gap-3 mb-1">
                                <div className={cn(
                                    "h-8 w-8 rounded-lg flex items-center justify-center transition-colors shrink-0",
                                    "bg-card border border-border group-hover:bg-card group-hover:shadow-sm"
                                )}>
                                    <source.icon className={cn("h-4 w-4", source.color)} />
                                </div>
                                <CardTitle className="text-base font-bold text-foreground leading-tight">
                                    {source.title}
                                </CardTitle>
                            </div>
                            <CardDescription className="text-xs text-muted-foreground leading-relaxed">
                                {source.description}
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="flex-1 p-4 pt-0">
                            {/* Spacer content if needed, currently empty to push footer down */}
                        </CardContent>

                        <CardFooter className="pt-0 pb-4 p-4">
                            {source.status === 'active' ? (
                                <Button
                                    className="w-full rounded-lg h-9 text-xs font-medium shadow-none"
                                    variant={source.connected ? "outline" : "default"}
                                >
                                    {source.connected ? (
                                        <>
                                            <CheckCircle2 className="mr-2 h-3 w-3 text-green-500" />
                                            Подключено
                                        </>
                                    ) : (
                                        <>
                                            Подключить <ArrowRight className="ml-2 h-3 w-3" />
                                        </>
                                    )}
                                </Button>
                            ) : (
                                <div className="w-full flex items-center justify-center h-9">
                                    <Badge
                                        variant="secondary"
                                        className="bg-muted text-muted-foreground hover:bg-muted border-border px-2.5 py-0.5 text-xs rounded-md"
                                    >
                                        Скоро
                                    </Badge>
                                </div>
                            )}
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    )
}
