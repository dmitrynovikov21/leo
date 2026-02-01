"use client"

import * as React from "react"
import { CheckCircle2, XCircle, ChevronDown, Award, AlertTriangle } from "lucide-react"

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export interface TestReport {
    score: number
    passedCount: number
    totalCount: number
    results: {
        id: string
        question: string
        answer: string
        passed: boolean
        reasoning: string
        citation?: string
    }[]
}

export function TestResultScorecard({ report }: { report: TestReport }) {
    const getScoreColor = (score: number) => {
        if (score >= 90) return "text-emerald-500"
        if (score >= 70) return "text-amber-500"
        return "text-destructive"
    }

    const getScoreBadge = (score: number) => {
        if (score >= 90) return <Badge className="bg-emerald-500 hover:bg-emerald-600">Отлично</Badge>
        if (score >= 70) return <Badge className="bg-amber-500 hover:bg-amber-600">Хорошо</Badge>
        return <Badge variant="destructive">Требует доработки</Badge>
    }

    return (
        <div className="space-y-6">
            {/* HERO SCORE CARD */}
            <Card className="border-t-4 border-t-primary">
                <CardContent className="pt-6">
                    <div className="flex flex-col items-center justify-center text-center space-y-2">
                        <div className="flex items-center gap-2 text-muted-foreground uppercase tracking-widest text-xs font-semibold">
                            <Award className="h-4 w-4" />
                            Качество ответов
                        </div>
                        <div className={cn("text-5xl font-bold tabular-nums", getScoreColor(report.score))}>
                            {report.score}/100
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                            {getScoreBadge(report.score)}
                            <span className="text-sm text-muted-foreground">
                                Пройдено {report.passedCount} из {report.totalCount} проверок
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* BREAKDOWN */}
            <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground px-1">Детальный разбор</h3>
                <Accordion type="single" collapsible className="w-full">
                    {report.results.map((result, index) => (
                        <AccordionItem
                            key={result.id}
                            value={result.id}
                            className={cn(
                                "border rounded-lg px-4 mb-2 bg-card",
                                !result.passed && "border-destructive/30 bg-destructive/5"
                            )}
                        >
                            <AccordionTrigger className="hover:no-underline py-4">
                                <div className="flex items-center gap-3 text-left">
                                    {result.passed ? (
                                        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                                    ) : (
                                        <XCircle className="h-5 w-5 text-destructive shrink-0" />
                                    )}
                                    <div className="flex-1">
                                        <span className="font-medium text-sm">{result.question}</span>
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-0 pb-4 space-y-4">
                                <div className="pl-8 space-y-3">
                                    <div className="space-y-1">
                                        <span className="text-xs font-semibold text-muted-foreground uppercase">Ответ агента</span>
                                        <div className="p-3 rounded-md bg-muted/50 text-sm italic">
                                            "{result.answer}"
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <span className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                                            <AlertTriangle className="h-3 w-3" /> Обоснование
                                        </span>
                                        <p className="text-sm text-muted-foreground">
                                            {result.reasoning}
                                        </p>
                                    </div>

                                    {result.citation && (
                                        <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-5">Citation</Badge>
                                            {result.citation}
                                        </div>
                                    )}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </div>
        </div>
    )
}
