"use client"

import * as React from "react"
import { useRouter, useParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { Check, Loader2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"

// Wizard data types
export interface WizardData {
    currentStep: number
    step1?: {
        url?: string
        parsedData?: any
        businessDescription?: string
        city?: string
        audience?: string
        agentName?: string
    }
    step2?: {
        files?: string[]
        manualFaq?: { question: string; answer: string }[]
        skipped?: boolean
    }
    step3?: {
        selectedStyle?: { id: string; label: string; text: string }
        responseLength?: "short" | "detailed"
        showSources?: boolean
        styleExamples?: any
    }
    step4?: {
        restrictions?: string[]
        customRestrictions?: string[]
        fallback?: string
        fallbackContact?: string
    }
    step5?: {
        generatedPrompt?: string
        editedPrompt?: string
        generatedAt?: string
    }
}

interface WizardLayoutProps {
    children: React.ReactNode
    currentStep: number
    onStepChange: (step: number) => void
    totalSteps?: number
    canGoNext?: boolean
    onNext?: () => void
    onBack?: () => void
    onSkip?: () => void
    onFinish?: () => void
    showSkip?: boolean
    nextLabel?: string
    finishLabel?: string
    saving?: boolean
}

const STEP_LABELS = [
    "О бизнесе",
    "База знаний",
    "Стиль общения",
    "Правила",
    "Готово",
]

export function WizardLayout({
    children,
    currentStep,
    onStepChange,
    totalSteps = 5,
    canGoNext = true,
    onNext,
    onBack,
    onSkip,
    onFinish,
    showSkip = false,
    nextLabel = "Далее →",
    finishLabel = "Создать агента",
    saving = false,
}: WizardLayoutProps) {
    return (
        <div className="max-w-4xl">
            {/* Progress bar */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                    {Array.from({ length: totalSteps }).map((_, i) => {
                        const stepNum = i + 1
                        const isCompleted = stepNum < currentStep
                        const isCurrent = stepNum === currentStep

                        return (
                            <React.Fragment key={i}>
                                <button
                                    onClick={() => stepNum < currentStep && onStepChange(stepNum)}
                                    disabled={stepNum > currentStep}
                                    className={cn(
                                        "flex items-center gap-2 text-xs font-medium transition-colors",
                                        isCompleted && "text-primary cursor-pointer hover:text-primary/80",
                                        isCurrent && "text-foreground",
                                        stepNum > currentStep && "text-muted-foreground/50 cursor-not-allowed"
                                    )}
                                >
                                    <div className={cn(
                                        "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors",
                                        isCompleted && "bg-primary text-primary-foreground",
                                        isCurrent && "bg-foreground text-background",
                                        stepNum > currentStep && "bg-muted text-muted-foreground"
                                    )}>
                                        {isCompleted ? <Check className="h-3.5 w-3.5" /> : stepNum}
                                    </div>
                                    <span className="hidden sm:inline">{STEP_LABELS[i]}</span>
                                </button>
                                {i < totalSteps - 1 && (
                                    <div className={cn(
                                        "flex-1 h-0.5 mx-2 rounded-full transition-colors",
                                        stepNum < currentStep ? "bg-primary" : "bg-muted"
                                    )} />
                                )}
                            </React.Fragment>
                        )
                    })}
                </div>
            </div>

            {/* Step content */}
            <div className="min-h-[400px] pb-20">
                {children}
            </div>

            {/* Navigation — sticky bottom */}
            <div className="sticky bottom-0 bg-background border-t border-border py-4 -mx-6 px-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {currentStep > 1 && (
                        <Button variant="ghost" onClick={onBack} className="rounded-xl">
                            ← Назад
                        </Button>
                    )}
                    {saving && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin" /> Сохранение...
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    {showSkip && (
                        <Button variant="ghost" onClick={onSkip} className="text-muted-foreground rounded-xl">
                            Пропустить
                        </Button>
                    )}
                    {currentStep < totalSteps ? (
                        <Button onClick={onNext} disabled={!canGoNext} className="rounded-xl h-10 px-6">
                            {nextLabel}
                        </Button>
                    ) : (
                        <Button onClick={onFinish} disabled={!canGoNext} className="rounded-xl h-10 px-6">
                            {finishLabel}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}

// Hook for autosaving wizard data
export function useWizardAutosave(agentId: string) {
    const timeoutRef = React.useRef<ReturnType<typeof setTimeout>>()
    const [saving, setSaving] = React.useState(false)

    const save = React.useCallback(async (step: number, data: any) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current)

        timeoutRef.current = setTimeout(async () => {
            setSaving(true)
            try {
                await fetch(`/api/agents/${agentId}/wizard`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ step, data }),
                })
            } catch (err) {
                console.error("Wizard autosave failed:", err)
            }
            setSaving(false)
        }, 2000)
    }, [agentId])

    const saveImmediate = React.useCallback(async (step: number, data: any) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        setSaving(true)
        try {
            await fetch(`/api/agents/${agentId}/wizard`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ step, data }),
            })
        } catch (err) {
            console.error("Wizard autosave failed:", err)
        }
        setSaving(false)
    }, [agentId])

    React.useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
        }
    }, [])

    return { save, saveImmediate, saving }
}
