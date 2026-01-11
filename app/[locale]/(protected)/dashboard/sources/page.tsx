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
        <div className="space-y-6 max-w-5xl p-6">
            {/* Page Header */}
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Источники коммуникации</h2>
                <p className="text-muted-foreground mt-1">
                    Управление подключенными каналами для всех ваших агентов.
                </p>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {SOURCES.map((source) => (
                    <Card
                        key={source.id}
                        className={cn(
                            "group flex flex-col h-full transition-all duration-200 border-zinc-200/50 shadow-sm rounded-2xl bg-white overflow-hidden",
                            source.status === 'active' ? "hover:shadow-md hover:border-zinc-300" : "opacity-70 bg-white grayscale-[0.5]"
                        )}
                    >
                        <CardHeader className="pb-4">
                            <div className={cn(
                                "h-12 w-12 rounded-xl flex items-center justify-center mb-4 transition-colors",
                                "bg-white border border-zinc-100 group-hover:bg-white group-hover:shadow-sm"
                            )}>
                                <source.icon className={cn("h-6 w-6", source.color)} />
                            </div>
                            <CardTitle className="text-lg font-bold text-zinc-900">
                                {source.title}
                            </CardTitle>
                            <CardDescription className="text-sm text-zinc-500 mt-2 leading-relaxed">
                                {source.description}
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="flex-1">
                            {/* Spacer content if needed, currently empty to push footer down */}
                        </CardContent>

                        <CardFooter className="pt-0 pb-6">
                            {source.status === 'active' ? (
                                <Button
                                    className="w-full rounded-xl h-10 font-medium shadow-none"
                                    variant={source.connected ? "outline" : "default"}
                                >
                                    {source.connected ? (
                                        <>
                                            <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                                            Подключено
                                        </>
                                    ) : (
                                        <>
                                            Подключить <ArrowRight className="ml-2 h-4 w-4" />
                                        </>
                                    )}
                                </Button>
                            ) : (
                                <div className="w-full flex items-center justify-center h-10">
                                    <Badge
                                        variant="secondary"
                                        className="bg-zinc-100 text-zinc-500 hover:bg-zinc-100 border-zinc-200 px-3 py-1 rounded-lg"
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
