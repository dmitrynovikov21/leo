"use client"

import * as React from "react"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { WizardData } from "./wizard-layout"

interface StyleExample {
    sampleQuestion: string
    styles: { id: string; label: string; text: string }[]
}

interface StepStyleProps {
    data: WizardData["step3"]
    onChange: (data: Partial<NonNullable<WizardData["step3"]>>) => void
    styleExamples: StyleExample | null
    loadingStyles: boolean
}

export function StepStyle({ data, onChange, styleExamples, loadingStyles }: StepStyleProps) {
    const selectedId = data?.selectedStyle?.id || ""
    const responseLength = data?.responseLength || "short"
    const showSources = data?.showSources ?? false

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-xl font-bold">Стиль общения</h3>
                <p className="text-sm text-muted-foreground mt-1">
                    Выберите, как агент будет отвечать клиентам
                </p>
            </div>

            {loadingStyles ? (
                <div className="space-y-4">
                    <Skeleton className="h-5 w-64" />
                    <Skeleton className="h-24 w-full rounded-xl" />
                    <Skeleton className="h-24 w-full rounded-xl" />
                    <Skeleton className="h-24 w-full rounded-xl" />
                    <p className="text-sm text-muted-foreground text-center">
                        Подбираем стиль под ваш бизнес...
                    </p>
                </div>
            ) : styleExamples ? (
                <>
                    {/* Sample question */}
                    <div className="rounded-xl bg-muted/50 p-4 border border-border">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Типичный вопрос от вашего клиента:</p>
                        <p className="text-sm font-medium">&ldquo;{styleExamples.sampleQuestion}&rdquo;</p>
                    </div>

                    {/* Style options */}
                    <div className="space-y-2">
                        <Label>Какой ответ вам ближе?</Label>
                        <div className="space-y-3">
                            {styleExamples.styles.map((style) => (
                                <button
                                    key={style.id}
                                    onClick={() => onChange({
                                        selectedStyle: { id: style.id, label: style.label, text: style.text },
                                    })}
                                    className={cn(
                                        "w-full text-left rounded-xl border-2 p-4 transition-all",
                                        selectedId === style.id
                                            ? "border-primary bg-primary/5 shadow-sm"
                                            : "border-border hover:border-primary/30 hover:bg-muted/30"
                                    )}
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={cn(
                                            "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                                            selectedId === style.id
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-muted text-muted-foreground"
                                        )}>
                                            {style.id}
                                        </span>
                                        <span className="text-sm font-semibold">{style.label}</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        {style.text}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            ) : (
                <div className="text-center py-8 text-muted-foreground">
                    <p>Не удалось сгенерировать примеры стиля.</p>
                    <p className="text-sm mt-1">Выберите длину ответов и переходите дальше.</p>
                </div>
            )}

            {/* Response length */}
            <div className="space-y-2">
                <Label>Длина ответов</Label>
                <div className="flex gap-3">
                    {[
                        { value: "short" as const, label: "Коротко и по делу" },
                        { value: "detailed" as const, label: "Подробно с деталями" },
                    ].map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => onChange({ responseLength: opt.value })}
                            className={cn(
                                "flex-1 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all",
                                responseLength === opt.value
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-primary/30"
                            )}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Show sources */}
            <div className="space-y-2">
                <Label>Показывать источник знаний в ответе</Label>
                <p className="text-xs text-muted-foreground">
                    Агент будет указывать файл-источник внизу ответа, например: <span className="italic">Источник: Устав-организации.docx стр. 5</span>
                </p>
                <div className="flex gap-3">
                    {[
                        { value: true, label: "Да" },
                        { value: false, label: "Нет" },
                    ].map((opt) => (
                        <button
                            key={String(opt.value)}
                            onClick={() => onChange({ showSources: opt.value })}
                            className={cn(
                                "flex-1 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all",
                                showSources === opt.value
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-primary/30"
                            )}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}
