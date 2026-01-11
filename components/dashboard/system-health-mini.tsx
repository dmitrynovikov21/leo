"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { CheckCircle2 } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// Mock system status
type ServiceStatus = "operational" | "degraded" | "down"

const mockSystemServices: Array<{ name: string; status: ServiceStatus }> = [
    { name: "OpenAI API", status: "operational" },
    { name: "Database", status: "operational" },
    { name: "Vector Store", status: "operational" },
    { name: "Message Queue", status: "operational" },
]

export function SystemHealthMini() {
    const t = useTranslations('Dashboard')

    const allOperational = mockSystemServices.every((s) => s.status === "operational")

    if (allOperational) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">{t('systemHealth')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <span className="text-sm font-medium">Все системы работают</span>
                        <Badge variant="secondary" className="ml-auto bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                            Operational
                        </Badge>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">{t('systemHealth')}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {mockSystemServices.map((service) => (
                        <div key={service.name} className="flex items-center justify-between text-sm">
                            <span>{service.name}</span>
                            <div
                                className={cn(
                                    "h-2 w-2 rounded-full",
                                    service.status === "operational" && "bg-emerald-500",
                                    service.status === "degraded" && "bg-amber-500",
                                    service.status === "down" && "bg-red-500"
                                )}
                            />
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
