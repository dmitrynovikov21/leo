"use client"

import * as React from "react"
import { useRouter, useParams } from "next/navigation"
import { toast } from "sonner"
import { useUserData } from "@/components/providers/user-data-provider"

import { WizardLayout, useWizardAutosave, type WizardData } from "@/components/agents/wizard/wizard-layout"
import { StepBusiness } from "@/components/agents/wizard/step-business"
import { StepKnowledge } from "@/components/agents/wizard/step-knowledge"
import { StepStyle } from "@/components/agents/wizard/step-style"
import { StepRules } from "@/components/agents/wizard/step-rules"
import { StepReview } from "@/components/agents/wizard/step-review"
import { Skeleton } from "@/components/ui/skeleton"

export default function WizardPage() {
    const router = useRouter()
    const params = useParams()
    const agentId = params.agentId as string
    const locale = params.locale as string
    const { refreshAgents } = useUserData()

    const [wizardData, setWizardData] = React.useState<WizardData>({ currentStep: 1 })
    const [currentStep, setCurrentStep] = React.useState(1)
    const [loading, setLoading] = React.useState(true)
    const [finishing, setFinishing] = React.useState(false)

    // AI state
    const [styleExamples, setStyleExamples] = React.useState<any>(null)
    const [loadingStyles, setLoadingStyles] = React.useState(false)
    const [generatedPrompt, setGeneratedPrompt] = React.useState("")
    const [isGeneratingPrompt, setIsGeneratingPrompt] = React.useState(false)

    const { save, saveImmediate, saving } = useWizardAutosave(agentId)

    // Load existing wizard state
    React.useEffect(() => {
        async function load() {
            try {
                const res = await fetch(`/api/agents/${agentId}/wizard`)
                if (res.ok) {
                    const data = await res.json()
                    if (data.wizardData && Object.keys(data.wizardData).length > 0) {
                        setWizardData(data.wizardData)
                        setCurrentStep(data.wizardStep || data.wizardData.currentStep || 1)
                        // Restore generated prompt if exists
                        if (data.wizardData.step5?.generatedPrompt) {
                            setGeneratedPrompt(data.wizardData.step5.generatedPrompt)
                        }
                        // Restore style examples
                        if (data.wizardData.step3?.styleExamples) {
                            setStyleExamples(data.wizardData.step3.styleExamples)
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to load wizard state:", err)
            }
            setLoading(false)
        }
        load()
    }, [agentId])

    // Update a step's data and trigger autosave
    const updateStepData = React.useCallback((step: number, data: any) => {
        setWizardData(prev => {
            const updated = {
                ...prev,
                currentStep: step,
                [`step${step}`]: {
                    ...(prev[`step${step}` as keyof WizardData] as any || {}),
                    ...data,
                },
            }
            save(step, data)
            return updated
        })
    }, [save])

    // Background generation: style examples
    const generateStyleExamples = React.useCallback(async () => {
        const s1 = wizardData.step1
        if (!s1?.businessDescription) return

        setLoadingStyles(true)
        try {
            const res = await fetch("/api/ai/generate-style-examples", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    businessDescription: s1.businessDescription,
                    audience: s1.audience,
                    city: s1.city,
                    parsedData: s1.parsedData,
                }),
            })
            if (res.ok) {
                const examples = await res.json()
                setStyleExamples(examples)
                // Save to wizard data for persistence
                updateStepData(3, { styleExamples: examples })
            }
        } catch (err) {
            console.error("Style generation failed:", err)
        }
        setLoadingStyles(false)
    }, [wizardData.step1, updateStepData])

    // Generate final prompt
    const generatePrompt = React.useCallback(async () => {
        const s1 = wizardData.step1
        if (!s1?.agentName) return

        setIsGeneratingPrompt(true)
        try {
            const res = await fetch("/api/ai/generate-agent-prompt", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    agentName: s1.agentName,
                    wizardV2: {
                        businessDescription: s1.businessDescription,
                        city: s1.city,
                        audience: s1.audience,
                        parsedWebsiteData: s1.parsedData,
                        manualFaq: wizardData.step2?.manualFaq,
                        selectedStyle: wizardData.step3?.selectedStyle,
                        responseLength: wizardData.step3?.responseLength,
                        restrictions: wizardData.step4?.restrictions,
                        customRestrictions: wizardData.step4?.customRestrictions,
                        fallbackBehavior: wizardData.step4?.fallback,
                        fallbackContact: wizardData.step4?.fallbackContact,
                    },
                }),
            })

            if (res.ok) {
                const data = await res.json()
                const prompt = data.systemPrompt || data.prompt || ""
                setGeneratedPrompt(prompt)
                updateStepData(5, {
                    generatedPrompt: prompt,
                    generatedAt: new Date().toISOString(),
                })
            } else {
                toast.error("Не удалось сгенерировать инструкцию")
            }
        } catch (err) {
            console.error("Prompt generation failed:", err)
            toast.error("Ошибка генерации")
        }
        setIsGeneratingPrompt(false)
    }, [wizardData, updateStepData])

    // Navigation
    const canGoNext = React.useMemo(() => {
        switch (currentStep) {
            case 1:
                return !!(wizardData.step1?.agentName?.trim() && wizardData.step1?.businessDescription?.trim())
            case 2:
                return true // Optional step
            case 3:
                return true // Style selection optional
            case 4:
                return true // Rules optional
            case 5:
                return !!generatedPrompt
            default:
                return true
        }
    }, [currentStep, wizardData, generatedPrompt])

    const handleNext = async () => {
        // Save current step immediately
        const stepData = wizardData[`step${currentStep}` as keyof WizardData]
        if (stepData) {
            await saveImmediate(currentStep, stepData)
        }

        const nextStep = currentStep + 1

        // Trigger background tasks
        if (currentStep === 1 && !styleExamples) {
            generateStyleExamples()
        }

        // Auto-generate prompt when entering step 5
        if (nextStep === 5 && !generatedPrompt) {
            setTimeout(generatePrompt, 100)
        }

        setCurrentStep(nextStep)
    }

    const handleBack = () => {
        setCurrentStep(Math.max(1, currentStep - 1))
    }

    const handleSkip = () => {
        if (currentStep === 2) {
            updateStepData(2, { skipped: true })
        }
        handleNext()
    }

    // Finish wizard: save ALL wizard data to agent fields, change status, redirect
    const handleFinish = async () => {
        setFinishing(true)
        try {
            const finalPrompt = generatedPrompt
            const s1 = wizardData.step1

            // Save final prompt to wizard data
            await saveImmediate(5, {
                generatedPrompt: finalPrompt,
                editedPrompt: finalPrompt,
            })

            // Finalize: save all wizard data to agent fields + DRAFT → STOPPED
            // This single call saves: name, displayName, description, systemPrompt,
            // tone, guardrails (from restrictions), welcomeMessage, conversationExamples (from FAQ)
            const finalizeRes = await fetch(`/api/agents/${agentId}/finalize`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    systemPrompt: finalPrompt,
                    name: s1?.agentName || "Новый агент",
                    description: s1?.businessDescription || "",
                    displayName: s1?.agentName,
                    // Pass full wizardData so finalize can extract all fields
                    wizardData: wizardData,
                }),
            })

            if (!finalizeRes.ok) {
                const err = await finalizeRes.json().catch(() => ({}))
                throw new Error(err.error || "Failed to finalize agent")
            }

            await refreshAgents()
            toast.success("Агент создан!")
            router.push(`/${locale}/dashboard/agents/${agentId}`)
        } catch (err) {
            console.error("Finalize failed:", err)
            toast.error("Ошибка при создании агента")
        }
        setFinishing(false)
    }

    if (loading) {
        return (
            <div className="max-w-4xl space-y-6">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-72" />
                <Skeleton className="h-32 w-full rounded-2xl" />
                <Skeleton className="h-32 w-full rounded-2xl" />
            </div>
        )
    }

    return (
        <WizardLayout
            currentStep={currentStep}
            onStepChange={setCurrentStep}
            canGoNext={canGoNext && !finishing}
            onNext={handleNext}
            onBack={handleBack}
            onSkip={handleSkip}
            onFinish={handleFinish}
            showSkip={currentStep === 2}
            saving={saving}
            finishLabel={finishing ? "Создаём..." : "Создать агента"}
        >
            {currentStep === 1 && (
                <StepBusiness
                    data={wizardData.step1}
                    onChange={(data) => updateStepData(1, data)}
                />
            )}
            {currentStep === 2 && (
                <StepKnowledge
                    agentId={agentId}
                    data={wizardData.step2}
                    onChange={(data) => updateStepData(2, data)}
                />
            )}
            {currentStep === 3 && (
                <StepStyle
                    data={wizardData.step3}
                    onChange={(data) => updateStepData(3, data)}
                    styleExamples={styleExamples}
                    loadingStyles={loadingStyles}
                />
            )}
            {currentStep === 4 && (
                <StepRules
                    data={wizardData.step4}
                    onChange={(data) => updateStepData(4, data)}
                    parsedContacts={wizardData.step1?.parsedData?.contacts}
                />
            )}
            {currentStep === 5 && (
                <StepReview
                    wizardData={wizardData}
                    generatedPrompt={generatedPrompt}
                    isGenerating={isGeneratingPrompt}
                    onRegenerate={generatePrompt}
                    onPromptChange={(prompt) => {
                        setGeneratedPrompt(prompt)
                        updateStepData(5, { editedPrompt: prompt })
                    }}
                />
            )}
        </WizardLayout>
    )
}
