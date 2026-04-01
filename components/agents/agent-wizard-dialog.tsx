"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Bot, Wand2, Upload, FileText, CheckCircle2, ChevronLeft, ChevronRight, X, Sparkles, Loader2, Power, ClipboardList, Zap } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogTrigger,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
// Import User Data Provider
import { useUserData } from "@/components/providers/user-data-provider"
// Import Smart Quiz Step
import { SmartQuizStep, initialQuizAnswers, type QuizAnswers } from "./smart-quiz-step"

// Schema
const agentSchema = z.object({
    name: z.string().min(2, "Имя должно быть минимум 2 символа"),
    role: z.string().min(1, "Выберите роль"),
    description: z.string().min(1, "Описание обязательно"), // Removed min 10
    systemPrompt: z.string(),
})

type AgentFormData = z.infer<typeof agentSchema>

const simpleSteps = [
    { id: 1, title: "О бизнесе" },
    { id: 2, title: "Цели" },
    { id: 3, title: "Тон" },
    { id: 4, title: "Инструкция" },
    { id: 5, title: "Knowledge" },
    { id: 6, title: "Review" },
]

const masterSteps = [
    { id: 1, title: "Persona" },
    { id: 2, title: "Knowledge" },
    { id: 3, title: "Review" },
]

const toneOptionsSimple = [
    { value: "official", label: "Официальный" },
    { value: "friendly", label: "Дружелюбный" },
    { value: "professional", label: "Профессиональный" },
    { value: "concise", label: "Лаконичный" },
    { value: "humorous", label: "С юмором" },
    { value: "empathetic", label: "Эмпатичный" },
    { value: "formal", label: "Формальный" },
    { value: "casual", label: "Неформальный" },
]

export function AgentWizardDialog() {
    const t = useTranslations('Agents.wizard');
    const tCommon = useTranslations('Common');
    const router = useRouter()
    const { data: session } = useSession()
    const { refreshAgents } = useUserData() // Context hook

    const [open, setOpen] = React.useState(false)
    const [step, setStep] = React.useState(1)
    const [wizardMode, setWizardMode] = React.useState<'simple' | 'master' | null>(null)
    const [uploadedFiles, setUploadedFiles] = React.useState<{ name: string, file: File }[]>([])
    const [chunks, setChunks] = React.useState<{ id: string, content: string }[]>([])
    const [isParsing, setIsParsing] = React.useState(false)
    const [isSavingChunks, setIsSavingChunks] = React.useState(false)
    const [isStarting, setIsStarting] = React.useState(false)
    const [chunksSaved, setChunksSaved] = React.useState(false)
    const [createdAgentId, setCreatedAgentId] = React.useState<string | null>(null)
    const [isCreatingAgent, setIsCreatingAgent] = React.useState(false)
    // Smart Quiz State
    const [quizAnswers, setQuizAnswers] = React.useState<QuizAnswers>(initialQuizAnswers)
    const [isGeneratingPrompt, setIsGeneratingPrompt] = React.useState(false)
    // Simple wizard extra state
    const [simpleTask, setSimpleTask] = React.useState("")
    const [simpleTones, setSimpleTones] = React.useState<string[]>(["friendly"])
    const [simpleCompiledText, setSimpleCompiledText] = React.useState("")

    // Dynamic steps based on wizard mode
    const steps = wizardMode === 'simple' ? simpleSteps : masterSteps
    const totalSteps = steps.length
    // Map simple wizard steps to knowledge/review
    const isKnowledgeStep = wizardMode === 'simple' ? step === 5 : step === 2
    const isReviewStep = wizardMode === 'simple' ? step === 6 : step === 3

    const form = useForm<AgentFormData>({
        resolver: zodResolver(agentSchema),
        defaultValues: {
            name: "",
            role: "",
            description: "",
            systemPrompt: "",
        },
    })

    const resetWizard = () => {
        setStep(1)
        setWizardMode(null)
        form.reset()
        setUploadedFiles([])
        setChunks([])
        setChunksSaved(false)
        setCreatedAgentId(null)
        setQuizAnswers(initialQuizAnswers)
        setSimpleTask("")
        setSimpleTones(["friendly"])
        setSimpleCompiledText("")
        setOpen(false)
    }

    // Build compiled text for step 4 preview
    const buildCompiledText = () => {
        const name = form.getValues('name') || ''
        const description = form.getValues('description') || ''
        const toneLabels = simpleTones.map(t => {
            const opt = toneOptionsSimple.find(o => o.value === t)
            return opt ? opt.label : t
        }).join(', ')
        const guardrails = "Соблюдай брендовые правила, отвечай фактически, задавай уточняющие вопросы и передавай оператору при рисках или ограничениях."

        const parts = [
            `Имя агента: ${name}`,
            `Контекст бизнеса: ${description}`,
            `Главная задача: ${simpleTask}`,
            `Тон общения: ${toneLabels}`,
            `Ограничения: ${guardrails}`,
        ]
        return parts.join('\n')
    }

    const handleGenerateSimplePrompt = async () => {
        const name = form.getValues('name')
        const description = form.getValues('description')
        if (!name || name.length < 2) {
            toast.error("Введите имя агента (минимум 2 символа)")
            return
        }
        if (!description) {
            toast.error("Введите описание агента")
            return
        }

        const toneLabels = simpleTones.map(t => {
            const opt = toneOptionsSimple.find(o => o.value === t)
            return opt ? opt.label : t
        }).join(', ')

        setIsGeneratingPrompt(true)
        try {
            const response = await fetch('/api/ai/generate-agent-prompt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    agentName: name,
                    agentDescription: description,
                    role: form.getValues('role') || description,
                    description: `${description}\n\nГлавная задача: ${simpleTask}\nТон общения: ${toneLabels}`,
                }),
            })
            if (response.status === 402) {
                toast.error('Отрицательный баланс PU', {
                    description: 'Пополните баланс в разделе Биллинг, чтобы продолжить.'
                })
                return
            }
            if (!response.ok) throw new Error('Failed to generate')
            const data = await response.json()
            const prompt = data.systemPrompt || data.prompt || data.content
            if (prompt) {
                form.setValue('systemPrompt', prompt)
                setSimpleCompiledText(prompt)
                toast.success('Инструкция сгенерирована!')
            } else {
                throw new Error('No prompt in response')
            }
        } catch (error) {
            console.error('Failed to generate prompt:', error)
            toast.error('Не удалось сгенерировать инструкцию')
        } finally {
            setIsGeneratingPrompt(false)
        }
    }

    const nextStep = async () => {
        // === Simple mode flow ===
        if (wizardMode === 'simple') {
            // Step 1: О бизнесе -> Step 2: Цели
            if (step === 1) {
                const name = form.getValues('name')
                const description = form.getValues('description')
                if (!name || name.length < 2) {
                    toast.error("Введите имя агента (минимум 2 символа)")
                    return
                }
                if (!description) {
                    toast.error("Введите описание агента")
                    return
                }
                setStep(2)
                return
            }
            // Step 2: Цели -> Step 3: Тон
            if (step === 2) {
                if (!simpleTask) {
                    toast.error("Опишите, что агент берёт на себя")
                    return
                }
                setStep(3)
                return
            }
            // Step 3: Тон -> Step 4: Улучшение инструкции
            if (step === 3) {
                if (simpleTones.length === 0) {
                    toast.error("Выберите хотя бы один тон общения")
                    return
                }
                // Build compiled text for step 4
                const compiled = buildCompiledText()
                setSimpleCompiledText(compiled)
                setStep(4)
                return
            }
            // Step 4: Улучшение инструкции -> Step 5: Knowledge (create agent here)
            if (step === 4) {
                if (!form.getValues('role')) {
                    form.setValue('role', 'assistant')
                }
                // Sync the compiled text to systemPrompt if user edited it
                if (simpleCompiledText && !form.getValues('systemPrompt')) {
                    form.setValue('systemPrompt', simpleCompiledText)
                }

                if (!createdAgentId) {
                    const newAgentId = await createAgent()
                    if (newAgentId) {
                        toast.success("Агент создан! Переходим к загрузке знаний...", { duration: 2000 })
                    } else {
                        return
                    }
                }
                setStep(5)
                return
            }
            // Step 5: Knowledge -> Step 6: Review
            if (step === 5) {
                if (chunks.length > 0 && !chunksSaved) {
                    toast.error('Сохраните чанки перед тем как продолжить')
                    return
                }
                setStep(6)
                return
            }
            return
        }

        // === Master mode flow ===
        if (step === 1) {
            // Validate quiz is filled
            if (!quizAnswers.role) {
                toast.error("Выберите роль агента")
                return
            }

            // Validation for Corporate Bot
            if (quizAnswers.role === 'corporate_bot') {
                const missingFieldIds: { id: string; label: string }[] = []
                if (!quizAnswers.identityName) missingFieldIds.push({ id: "field-identityName", label: "Имя ассистента" })
                if (!quizAnswers.identityPosition) missingFieldIds.push({ id: "field-identityName", label: "Должность" })
                if (!quizAnswers.audience) missingFieldIds.push({ id: "field-audience", label: "Аудитория" })
                if (!quizAnswers.strictness) missingFieldIds.push({ id: "field-strictness", label: "Источник знаний" })
                if (!quizAnswers.citations) missingFieldIds.push({ id: "field-citations", label: "Ссылки" })
                if (!quizAnswers.conflicts) missingFieldIds.push({ id: "field-conflicts", label: "Противоречия" })
                if (!quizAnswers.answerDepth) missingFieldIds.push({ id: "field-answerDepth", label: "Глубина" })
                if (!quizAnswers.format) missingFieldIds.push({ id: "field-format", label: "Оформление" })
                if (!quizAnswers.fallback) missingFieldIds.push({ id: "field-fallback", label: "Если нет ответа" })

                if (missingFieldIds.length > 0) {
                    const firstField = document.getElementById(missingFieldIds[0].id)
                    firstField?.scrollIntoView({ behavior: "smooth", block: "center" })
                    toast.error(`Заполните поле: ${missingFieldIds[0].label}`, {
                        description: missingFieldIds.length > 1
                            ? `Ещё не заполнено: ${missingFieldIds.slice(1).map(f => f.label).join(", ")}`
                            : undefined
                    })
                    return
                }

                if (quizAnswers.identityName.length < 2) {
                    const el = document.getElementById("field-identityName")
                    el?.scrollIntoView({ behavior: "smooth", block: "center" })
                    toast.error("Имя ассистента должно быть минимум 2 символа")
                    return
                }
            }

            // Sync quiz answers to form data
            form.setValue("name", quizAnswers.identityName)
            form.setValue("description", quizAnswers.identityPosition)
            form.setValue("role", quizAnswers.role)

            // Generate prompt from quiz if not yet generated
            let systemPrompt = form.getValues("systemPrompt")
            if (!systemPrompt || systemPrompt.trim().length < 10) {
                setIsGeneratingPrompt(true)
                try {
                    const filteredQuizAnswers = Object.fromEntries(
                        Object.entries(quizAnswers).filter(([, value]) => {
                            if (Array.isArray(value)) return value.length > 0
                            if (typeof value === 'string') return value !== ''
                            return value !== undefined && value !== null
                        })
                    )

                    const response = await fetch('/api/ai/generate-agent-prompt', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            agentName: form.getValues('name'),
                            agentDescription: form.getValues('description'),
                            quizAnswers: filteredQuizAnswers,
                        }),
                    })

                    if (response.status === 402) {
                        toast.error('Отрицательный баланс PU', {
                            description: 'Пополните баланс в разделе Биллинг, чтобы продолжить.'
                        })
                        setIsGeneratingPrompt(false)
                        return
                    }
                    if (!response.ok) throw new Error('Failed to generate')

                    const data = await response.json()
                    if (data.systemPrompt || data.prompt) {
                        systemPrompt = data.systemPrompt || data.prompt
                        form.setValue('systemPrompt', systemPrompt)
                        toast.success('Инструкция сгенерирована!')
                    } else {
                        throw new Error('No prompt in response')
                    }
                } catch (error) {
                    console.error('Failed to generate prompt:', error)
                    toast.error('Не удалось сгенерировать инструкцию')
                    setIsGeneratingPrompt(false)
                    return
                } finally {
                    setIsGeneratingPrompt(false)
                }
            }

            if (!createdAgentId) {
                const newAgentId = await createAgent()
                if (newAgentId) {
                    toast.success("Агент создан! Переходим к загрузке знаний...", { duration: 2000 })
                } else {
                    return
                }
            }
        }

        // Step 2: Knowledge -> Step 3: Review
        // нельзя идти дальше если есть несохранённые чанки
        if (step === 2 && chunks.length > 0 && !chunksSaved) {
            toast.error('Сохраните чанки перед тем как продолжить')
            return
        }
        setStep((prev) => Math.min(prev + 1, totalSteps))
    }

    // Создание агента через API
    const createAgent = async (): Promise<string | null> => {
        setIsCreatingAgent(true)

        try {
            // Call local API which proxies to orchestrator
            const response = await fetch('/api/agents', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: session?.user?.id || "",
                    name: form.getValues('name'),
                    role: form.getValues('role'),
                    description: form.getValues('description'),
                    systemPrompt: form.getValues('systemPrompt'),
                }),
            })

            if (!response.ok) {
                throw new Error('Failed to create agent')
            }

            const data = await response.json()
            setCreatedAgentId(data.id)

            // Create initial prompt version (v1.0)
            const systemPrompt = form.getValues('systemPrompt')
            if (systemPrompt) {
                try {
                    await fetch(`/api/orchestrator/agents/${data.id}/prompts`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            version: 'v1.0',
                            content: systemPrompt,
                            isActive: true,
                        }),
                    })
                } catch (promptErr) {
                    console.error('Failed to create initial prompt version:', promptErr)
                }
            }

            // Initialize behavior with displayName, constraints, and tone from quiz
            const agentName = form.getValues('name')

            // Map constraint IDs to Russian labels
            const constraintLabels: Record<string, string> = {
                no_swearing: "Не материться",
                no_prices: "Не называть цены",
                no_competitors: "Не обсуждать конкурентов",
                no_hallucination: "Не галлюцинировать",
            }

            let guardrails: { rule: string }[]
            let toneArray: string[]

            if (wizardMode === 'simple') {
                // Simple mode: use simpleTones and default guardrails
                toneArray = simpleTones.length > 0 ? simpleTones : ['friendly']
                guardrails = [
                    { rule: "Соблюдай брендовые правила" },
                    { rule: "Отвечай фактически" },
                    { rule: "Задавай уточняющие вопросы" },
                    { rule: "Передавай оператору при рисках или ограничениях" },
                ]
            } else {
                // Master mode: use quiz constraints and tone
                guardrails = [
                    ...quizAnswers.constraints.map(id => constraintLabels[id] || id),
                    ...quizAnswers.customConstraints
                ].filter(Boolean).map(constraint => ({ rule: constraint }))

                // Get tone of voice value as array
                const toneValue = quizAnswers.toneOfVoice === 'custom'
                    ? quizAnswers.toneOfVoiceCustom
                    : quizAnswers.toneOfVoice
                toneArray = toneValue ? [toneValue] : ['friendly']
            }

            try {
                await fetch(`/api/orchestrator/agents/${data.id}/behavior`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        displayName: agentName,
                        avatarEmoji: '🤖',  // Default emoji
                        tone: toneArray,
                        guardrails: guardrails,
                    }),
                })
            } catch (behaviorErr) {
                console.error('Failed to initialize behavior:', behaviorErr)
            }

            await refreshAgents() // Refresh list
            return data.id
        } catch (error) {
            console.error('Error creating agent:', error)
            toast.error(tCommon('error'), {
                description: 'Не удалось создать агента'
            })
            return null
        } finally {
            setIsCreatingAgent(false)
        }
    }

    // Проверка можно ли нажать Далее
    const canProceed = () => {
        if (isParsing || isSavingChunks || isCreatingAgent || isGeneratingPrompt) return false
        if (step === 1 && !wizardMode) return false
        if (isKnowledgeStep && chunks.length > 0 && !chunksSaved) return false
        return true
    }

    const prevStep = () => {
        if (step === 1 && wizardMode) {
            setWizardMode(null)
            return
        }
        setStep((prev) => Math.max(prev - 1, 1))
    }

    const toggleSimpleTone = (toneValue: string) => {
        setSimpleTones(prev =>
            prev.includes(toneValue)
                ? prev.filter(t => t !== toneValue)
                : [...prev, toneValue]
        )
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploadedFiles(prev => [...prev, { name: file.name, file }])
        setIsParsing(true)

        try {
            const formData = new FormData()
            formData.append('file', file)

            const response = await fetch(`/api/gateway/documents/parse-semantic`, {
                method: 'POST',
                body: formData,
            })

            if (!response.ok) {
                throw new Error('Failed to parse document')
            }

            const data = await response.json()
            const parsedChunks = (data.chunks || []).map((chunk: any, index: number) => ({
                id: `${file.name}-${index}`,
                content: typeof chunk === 'string' ? chunk : chunk.content || chunk.text || '',
            }))

            setChunks(prev => [...prev, ...parsedChunks])
            toast.success(t('fileUploaded'), {
                description: `Создано ${parsedChunks.length} чанков`
            })
        } catch (error) {
            console.error('Error parsing document:', error)
            toast.error(tCommon('error'), {
                description: 'Не удалось разобрать файл'
            })
        } finally {
            setIsParsing(false)
        }
    }

    const handleRemoveFile = (index: number) => {
        setUploadedFiles(prev => prev.filter((_, i) => i !== index))
    }

    const handleChunkEdit = (id: string, newContent: string) => {
        setChunks(prev => prev.map(chunk =>
            chunk.id === id ? { ...chunk, content: newContent } : chunk
        ))
    }

    const handleRemoveChunk = (id: string) => {
        setChunks(prev => prev.filter(chunk => chunk.id !== id))
    }

    const handleSaveChunks = async () => {
        if (chunks.length === 0) {
            toast.info('Нет чанков для сохранения')
            return
        }

        setIsSavingChunks(true)

        try {
            const response = await fetch(`/api/gateway/documents/vectorize`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    agentId: createdAgentId,
                    userId: session?.user?.id,
                    filename: uploadedFiles[0]?.name || 'documents',
                    chunks: chunks.map((c, index) => ({
                        index,
                        text: c.content,
                    })),
                }),
            })

            if (!response.ok) {
                throw new Error('Failed to vectorize chunks')
            }

            setChunksSaved(true)
            toast.success('Чанки успешно сохранены в базу знаний!')
        } catch (error) {
            console.error('Error saving chunks:', error)
            toast.error(tCommon('error'), {
                description: 'Не удалось сохранить чанки'
            })
        } finally {
            setIsSavingChunks(false)
        }
    }

    const handleStartAgent = async () => {
        if (!createdAgentId) {
            toast.error("Agent ID not found")
            return
        }

        setIsStarting(true)
        try {
            // Updated logic: Redirect to Behavior page after creation
            toast.success(tCommon('success'), {
                description: "Агент создан! Переходим к настройкам..."
            })
            setOpen(false)
            router.push(`/dashboard/agents/${createdAgentId}/behavior`)
        } catch (error) {
            console.error(error)
            toast.error(tCommon('error'))
        } finally {
            setIsStarting(false)
        }
    }

    const WizardSelectionCard = ({
        icon: Icon,
        title,
        desc,
        onClick
    }: { icon: any, title: string, desc: string, onClick: () => void }) => (
        <div
            onClick={onClick}
            className="group relative flex cursor-pointer flex-col gap-4 rounded-xl border bg-card p-6 shadow-sm transition-all hover:border-primary hover:shadow-md"
        >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="h-6 w-6" />
            </div>
            <div className="space-y-1">
                <h3 className="font-semibold leading-none tracking-tight">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
        </div>
    )

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="lg" className="shadow-md hover:shadow-lg transition-all">
                    <Sparkles className="mr-2 h-4 w-4" />
                    {t('hireNewAgent')}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col overflow-hidden sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>{t('createNew')}</DialogTitle>
                    <DialogDescription>
                        {t('configureIdentity')}
                    </DialogDescription>
                </DialogHeader>

                {/* Progress Bar */}
                <div className="mb-4 space-y-2">
                    <Progress value={(step / totalSteps) * 100} className="h-2" />
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto px-1 py-4 relative">
                    <AnimatePresence mode="wait">
                        {step === 1 && !wizardMode && (
                            <motion.div
                                key="step0-mode"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="text-center space-y-2 mb-6">
                                    <h3 className="text-lg font-semibold">Выберите режим создания</h3>
                                    <p className="text-sm text-muted-foreground">Простой режим для быстрого старта или мастер для детальной настройки</p>
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <WizardSelectionCard
                                        icon={Zap}
                                        title="Простой режим"
                                        desc="Укажите имя, описание и сгенерируйте инструкцию за пару кликов"
                                        onClick={() => setWizardMode('simple')}
                                    />
                                    <WizardSelectionCard
                                        icon={ClipboardList}
                                        title="Мастер настройки"
                                        desc="Детальная анкета из 8 вопросов для точной настройки поведения"
                                        onClick={() => setWizardMode('master')}
                                    />
                                </div>
                            </motion.div>
                        )}

                        {/* Simple Mode - Step 1: О вашем бизнесе */}
                        {step === 1 && wizardMode === 'simple' && (
                            <motion.div
                                key="step1-simple"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-5"
                            >
                                <div className="text-center space-y-2 mb-6">
                                    <h3 className="text-lg font-semibold">О вашем бизнесе</h3>
                                    <p className="text-sm text-muted-foreground">Расскажите по-человечески, чем занимаетесь, кто к вам приходит и за что вас любят.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="simple-name">Имя вашего агента</Label>
                                    <Input
                                        id="simple-name"
                                        placeholder="Например: Анна, Менеджер поддержки"
                                        {...form.register("name")}
                                        className="h-11"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="simple-desc">Опишите бизнес так, как общаетесь с клиентом</Label>
                                    <Textarea
                                        id="simple-desc"
                                        placeholder="Например: мы цветочная мастерская в Алматы, собираем срочные букеты и ведём корпоративные подписки."
                                        {...form.register("description")}
                                        className="min-h-[100px] resize-none"
                                    />
                                    <p className="text-xs text-muted-foreground">Добавьте детали, которые чаще всего всплывают — ассистент заговорит именно так.</p>
                                </div>
                            </motion.div>
                        )}

                        {/* Simple Mode - Step 2: О ваших целях */}
                        {step === 2 && wizardMode === 'simple' && (
                            <motion.div
                                key="step2-simple"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-5"
                            >
                                <div className="text-center space-y-2 mb-6">
                                    <h3 className="text-lg font-semibold">О ваших целях</h3>
                                    <p className="text-sm text-muted-foreground">Поделитесь, какой результат хотите видеть каждый день и что готовы доверить ассистенту.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="simple-task">Что агент берёт на себя?</Label>
                                    <Textarea
                                        id="simple-task"
                                        placeholder="Пример: помочь выбрать букет, уточнить адрес доставки и собрать предоплату за свадьбу."
                                        value={simpleTask}
                                        onChange={(e) => setSimpleTask(e.target.value)}
                                        className="min-h-[120px] resize-none"
                                    />
                                    <p className="text-xs text-muted-foreground">Пара предложений о самом важном — уже отлично.</p>
                                </div>
                            </motion.div>
                        )}

                        {/* Simple Mode - Step 3: Тон общения */}
                        {step === 3 && wizardMode === 'simple' && (
                            <motion.div
                                key="step3-simple"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-5"
                            >
                                <div className="text-center space-y-2 mb-6">
                                    <h3 className="text-lg font-semibold">Тон общения</h3>
                                    <p className="text-sm text-muted-foreground">Выберите, как ваш агент будет общаться с клиентами</p>
                                </div>
                                <div className="flex flex-wrap gap-2 justify-center">
                                    {toneOptionsSimple.map((tone) => {
                                        const isSelected = simpleTones.includes(tone.value)
                                        return (
                                            <button
                                                key={tone.value}
                                                type="button"
                                                className={cn(
                                                    "px-4 py-2 rounded-xl border transition-all duration-200 text-sm font-medium",
                                                    isSelected
                                                        ? "border-primary bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
                                                        : "border-border bg-card text-muted-foreground hover:border-border hover:bg-muted/50"
                                                )}
                                                onClick={() => toggleSimpleTone(tone.value)}
                                            >
                                                {tone.label}
                                            </button>
                                        )
                                    })}
                                </div>
                            </motion.div>
                        )}

                        {/* Simple Mode - Step 4: Улучшение инструкции */}
                        {step === 4 && wizardMode === 'simple' && (
                            <motion.div
                                key="step4-simple"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-5"
                            >
                                <div className="text-center space-y-2 mb-6">
                                    <h3 className="text-lg font-semibold">Улучшение инструкции</h3>
                                    <p className="text-sm text-muted-foreground">Мы поможем вам улучшить инструкцию агента с помощью ИИ</p>
                                </div>

                                {/* Preview card */}
                                <div className="rounded-lg border bg-muted/50 p-4 space-y-2 text-sm">
                                    <div><span className="font-medium text-foreground">Имя агента:</span> <span className="text-muted-foreground">{form.getValues('name')}</span></div>
                                    <div><span className="font-medium text-foreground">Контекст бизнеса:</span> <span className="text-muted-foreground">{form.getValues('description')}</span></div>
                                    <div><span className="font-medium text-foreground">Главная задача:</span> <span className="text-muted-foreground">{simpleTask}</span></div>
                                    <div><span className="font-medium text-foreground">Тон общения:</span> <span className="text-muted-foreground">{simpleTones.map(t => { const opt = toneOptionsSimple.find(o => o.value === t); return opt ? opt.label : t }).join(', ')}</span></div>
                                    <div><span className="font-medium text-foreground">Ограничения:</span> <span className="text-muted-foreground">Соблюдай брендовые правила, отвечай фактически, задавай уточняющие вопросы и передавай оператору при рисках или ограничениях.</span></div>
                                </div>

                                {/* Editable textarea */}
                                <div className="space-y-2">
                                    <Textarea
                                        value={simpleCompiledText}
                                        onChange={(e) => {
                                            setSimpleCompiledText(e.target.value)
                                            form.setValue('systemPrompt', e.target.value)
                                        }}
                                        className="min-h-[180px] font-mono text-sm resize-none"
                                        placeholder="Здесь появится скомпилированная инструкция..."
                                    />
                                    <p className="text-xs text-muted-foreground">Поправьте формулировки, добавьте то, что забыли, и нажмите «Улучшить», чтобы перейти дальше.</p>
                                </div>

                                {/* Generate button */}
                                <div className="flex justify-center">
                                    <Button
                                        type="button"
                                        onClick={handleGenerateSimplePrompt}
                                        disabled={isGeneratingPrompt}
                                        className="h-10"
                                    >
                                        {isGeneratingPrompt ? (
                                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Генерация...</>
                                        ) : (
                                            <><Wand2 className="mr-2 h-4 w-4" /> Улучшить с ИИ</>
                                        )}
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {step === 1 && wizardMode === 'master' && (
                            <motion.div
                                key="step1-master"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <SmartQuizStep
                                    answers={quizAnswers}
                                    onChange={setQuizAnswers}
                                    isGenerating={isGeneratingPrompt}
                                />
                            </motion.div>
                        )}

                        {isKnowledgeStep && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                {/* File Upload */}
                                <div className="rounded-lg border border-dashed p-6 text-center hover:bg-muted/50 transition-colors">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="rounded-full bg-primary/10 p-4">
                                            <Upload className="h-8 w-8 text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold">{t('uploadKnowledgeBase')}</h3>
                                            <p className="text-sm text-muted-foreground">{t('dragDropFiles')}</p>
                                        </div>
                                        <Input
                                            type="file"
                                            className="max-w-xs cursor-pointer"
                                            onChange={handleFileUpload}
                                            disabled={isParsing}
                                            accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.md,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/markdown"
                                        />
                                        {isParsing && (
                                            <p className="text-sm text-muted-foreground animate-pulse">
                                                Обработка файла...
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Uploaded Files */}
                                {uploadedFiles.length > 0 && (
                                    <div className="space-y-2">
                                        <Label>Загруженные файлы</Label>
                                        <div className="grid gap-2">
                                            {uploadedFiles.map((file, i) => (
                                                <div key={i} className="flex items-center gap-3 rounded-md border p-3">
                                                    <FileText className="h-5 w-5 text-muted-foreground" />
                                                    <span className="text-sm flex-1 truncate">{file.name}</span>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                                        onClick={() => handleRemoveFile(i)}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Chunks Editor */}
                                {chunks.length > 0 && (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <Label>Чанки ({chunks.length})</Label>
                                            <Button
                                                variant="default"
                                                size="sm"
                                                onClick={handleSaveChunks}
                                                disabled={isSavingChunks}
                                            >
                                                {isSavingChunks ? 'Сохранение...' : 'Сохранить в базу знаний'}
                                            </Button>
                                        </div>
                                        <div className="max-h-[300px] overflow-y-auto space-y-3">
                                            {chunks.map((chunk, i) => (
                                                <div key={chunk.id} className="rounded-md border p-3 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs text-muted-foreground">
                                                            Чанк {i + 1}
                                                        </span>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                                            onClick={() => handleRemoveChunk(chunk.id)}
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                    <Textarea
                                                        value={chunk.content}
                                                        onChange={(e) => handleChunkEdit(chunk.id, e.target.value)}
                                                        className="min-h-[80px] text-sm"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {isReviewStep && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="space-y-6 rounded-lg border p-6 shadow-sm">
                                    <h3 className="text-lg font-semibold">{t('agentSummary')}</h3>

                                    <div className="grid gap-6 md:grid-cols-2">
                                        <div className="space-y-1">
                                            <Label className="text-muted-foreground">{t('name')}</Label>
                                            <div className="flex items-center gap-2 font-medium">
                                                <Bot className="h-4 w-4" />
                                                {form.getValues("name")}
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-muted-foreground">{t('roleLabel')}</Label>
                                            <div className="font-medium capitalize">{form.getValues("role")}</div>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-muted-foreground">{t('descriptionField')}</Label>
                                        <p className="text-sm">{form.getValues("description")}</p>
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-muted-foreground">{t('knowledgeBase')}</Label>
                                        <div className="flex gap-2">
                                            {uploadedFiles.length > 0 ? (
                                                uploadedFiles.map((f, i) => (
                                                    <Badge key={i} variant="secondary">{f.name}</Badge>
                                                ))
                                            ) : (
                                                <span className="text-sm text-muted-foreground italic">{t('noFilesUploaded')}</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-muted-foreground">{t('systemPersonaField')}</Label>
                                        <div className="rounded-md bg-muted p-3 text-xs font-mono text-muted-foreground line-clamp-3">
                                            {form.getValues("systemPrompt")}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                </div>

                <DialogFooter className="flex items-center justify-between sm:justify-between px-1">
                    {step > 0 ? (
                        <div className="flex w-full justify-between">
                            {(step > 1 || wizardMode) ? (
                                <Button variant="ghost" onClick={prevStep}>
                                    <ChevronLeft className="mr-2 h-4 w-4" />
                                    {t('back')}
                                </Button>
                            ) : (
                                <div />
                            )}
                            {!isReviewStep ? (
                                <Button onClick={nextStep} disabled={!canProceed()}>
                                    {isParsing ? 'Обработка...' : t('next')}
                                    <ChevronRight className="ml-2 h-4 w-4" />
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleStartAgent}
                                    disabled={isStarting}
                                    className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto"
                                >
                                    {isStarting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            {t('starting')}
                                        </>
                                    ) : (
                                        <>
                                            {t('configureAgent') || 'Настроить агента'}
                                            <ChevronRight className="ml-2 h-4 w-4" />
                                        </>
                                    )}
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="flex w-full justify-end">
                            <Button variant="ghost" onClick={() => setOpen(false)}>{t('cancel')}</Button>
                        </div>
                    )}
                </DialogFooter>

                {/* Loader Overlay - Global for Dialog */}
                {isGeneratingPrompt && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm transition-all duration-300">
                        <div className="flex flex-col items-center gap-3 animate-in fade-in zoom-in-95 duration-300">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <span className="text-lg font-medium">Генерируем инструкцию</span>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
