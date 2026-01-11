"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { MessageCircle, AlertTriangle, CheckCircle2, Upload, UserPlus, Bot } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

import { SystemEventData } from "@/lib/data/types"

// Event types with small icons
const eventIcons: Record<string, any> = {
    message: MessageCircle,
    warning: AlertTriangle,
    success: CheckCircle2,
    upload: Upload,
    user: UserPlus,
    bot: Bot,
}

interface SystemEventsLogProps {
    events?: SystemEventData[]
}

export function SystemEventsLog({ events = [] }: SystemEventsLogProps) {
    const t = useTranslations('Dashboard')

    return (
        <Card className="h-full bg-white border border-zinc-200/50 shadow-[0_2px_8px_rgba(0,0,0,0.04)] rounded-2xl">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-zinc-900">{t('systemEvents')}</CardTitle>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[420px] pr-3">
                    <div className="space-y-2">
                        {events.map((event) => {
                            const Icon = eventIcons[event.type] || eventIcons.message

                            return (
                                <div key={event.id} className="flex items-start gap-2 py-1.5">
                                    {/* Small icon (16x16) */}
                                    <Icon
                                        className={cn(
                                            "h-4 w-4 shrink-0 mt-0.5",
                                            event.type === "success" && "text-emerald-500",
                                            event.type === "warning" && "text-amber-500",
                                            event.type === "message" && "text-blue-500",
                                            event.type === "upload" && "text-purple-500",
                                            event.type === "user" && "text-indigo-500",
                                            event.type === "bot" && "text-cyan-500"
                                        )}
                                    />

                                    {/* Event text */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm leading-snug">{event.text}</p>
                                    </div>

                                    {/* Time */}
                                    <span className="text-xs text-muted-foreground tabular-nums font-mono shrink-0">
                                        {event.time}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    )
}
