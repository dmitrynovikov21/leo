"use client"

import * as React from "react"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { RefreshCw, Pencil, Bot, MapPin, Users, Shield, MessageSquare, FileText } from "lucide-react"
import type { WizardData } from "./wizard-layout"

interface StepReviewProps {
    wizardData: WizardData
    generatedPrompt: string
    isGenerating: boolean
    onRegenerate: () => void
    onPromptChange: (prompt: string) => void
}

const AUDIENCE_LABELS: Record<string, string> = {
    b2c: "B2C (частные лица)",
    b2b: "B2B (компании)",
    internal: "Внутренний",
    mixed: "Смешанный",
}

const FALLBACK_LABELS: Record<string, string> = {
    leave_phone: "Оставить номер",
    email: "Написать на email",
    call: "Позвонить",
    will_check: "Уточнить и вернуться",
}

export function StepReview({
    wizardData,
    generatedPrompt,
    isGenerating,
    onRegenerate,
    onPromptChange,
}: StepReviewProps) {
    const [isEditing, setIsEditing] = React.useState(false)

    const s1 = wizardData.step1
    const s2 = wizardData.step2
    const s3 = wizardData.step3
    const s4 = wizardData.step4

    const allRestrictions = [
        ...(s4?.restrictions || []),
        ...(s4?.customRestrictions || []),
    ]

    const filesCount = s2?.files?.length || 0
    const faqCount = s2?.manualFaq?.filter(f => f.question && f.answer)?.length || 0

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-xl font-bold">Ваш агент готов</h3>
                <p className="text-sm text-muted-foreground mt-1">
                    Проверьте настройки и сгенерированную инструкцию
                </p>
            </div>

            {/* Summary card */}
            <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-3">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Bot className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="font-bold">{s1?.agentName || "Агент"}</p>
                        <p className="text-xs text-muted-foreground">{s1?.businessDescription?.slice(0, 80)}</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                    {s1?.city && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5" /> {s1.city}
                        </div>
                    )}
                    {s1?.audience && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Users className="h-3.5 w-3.5" /> {AUDIENCE_LABELS[s1.audience] || s1.audience}
                        </div>
                    )}
                    {s3?.selectedStyle && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                            <MessageSquare className="h-3.5 w-3.5" /> {s3.selectedStyle.label} · {s3.responseLength === "short" ? "Короткие" : "Подробные"}
                        </div>
                    )}
                    {allRestrictions.length > 0 && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Shield className="h-3.5 w-3.5" /> {allRestrictions.length} правил
                        </div>
                    )}
                    {(filesCount > 0 || faqCount > 0) && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                            <FileText className="h-3.5 w-3.5" />
                            {filesCount > 0 && `${filesCount} файлов`}
                            {filesCount > 0 && faqCount > 0 && " + "}
                            {faqCount > 0 && `${faqCount} FAQ`}
                        </div>
                    )}
                    {s4?.fallback && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                            <span className="text-xs">Не знает →</span> {FALLBACK_LABELS[s4.fallback] || s4.fallback}
                        </div>
                    )}
                </div>
            </div>

            {/* Generated prompt */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <Label>Инструкция агента</Label>
                    <div className="flex gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onRegenerate}
                            disabled={isGenerating}
                        >
                            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isGenerating ? "animate-spin" : ""}`} />
                            Регенерировать
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsEditing(!isEditing)}
                        >
                            <Pencil className="h-3.5 w-3.5 mr-1" />
                            {isEditing ? "Готово" : "Редактировать"}
                        </Button>
                    </div>
                </div>

                {isGenerating ? (
                    <div className="space-y-3 p-4 rounded-xl bg-muted/30 border border-border">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                        <Skeleton className="h-4 w-4/5" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                        <p className="text-sm text-muted-foreground text-center mt-4">
                            Создаём инструкцию на основе ваших данных...
                        </p>
                    </div>
                ) : isEditing ? (
                    <Textarea
                        value={generatedPrompt}
                        onChange={(e) => onPromptChange(e.target.value)}
                        rows={16}
                        className="font-mono text-xs"
                    />
                ) : (
                    <div className="rounded-xl bg-muted/30 border border-border p-4 max-h-[400px] overflow-y-auto">
                        <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans">
                            {generatedPrompt || "Инструкция пока не сгенерирована"}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    )
}
