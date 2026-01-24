"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Bot, Wand2, Upload, FileText, CheckCircle2, ChevronLeft, ChevronRight, X, Sparkles, Loader2, Power } from "lucide-react"
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

const steps = [
    { id: 1, title: "Persona" },
    { id: 2, title: "Knowledge" },
    { id: 3, title: "Review" },
]

export function AgentWizardDialog() {
    const t = useTranslations('Agents.wizard');
    const tCommon = useTranslations('Common');
    const router = useRouter()
    const { data: session } = useSession()
    const { refreshAgents } = useUserData() // Context hook

    const [open, setOpen] = React.useState(false)
    const [step, setStep] = React.useState(1)
    const [isGenerating, setIsGenerating] = React.useState(false)
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
        form.reset()
        setUploadedFiles([])
        setChunks([])
        setChunksSaved(false)
        setCreatedAgentId(null)
        setQuizAnswers(initialQuizAnswers)
        setOpen(false)
    }

    const nextStep = async () => {
        // Step 1: Persona -> Step 2: Knowledge
        // генерируем промпт из quiz и создаём агента
        if (step === 1) {
            // Validate quiz is filled
            if (!quizAnswers.role) {
                toast.error("Выберите роль агента")
                return
            }

            // Validation for Corporate Bot
            if (quizAnswers.role === 'corporate_bot') {
                const missingFields: string[] = []
                if (!quizAnswers.identityName) missingFields.push("Имя ассистента")
                if (!quizAnswers.identityPosition) missingFields.push("Должность")
                if (!quizAnswers.audience) missingFields.push("Аудитория")
                if (!quizAnswers.strictness) missingFields.push("Источник знаний")
                if (!quizAnswers.citations) missingFields.push("Ссылки")
                if (!quizAnswers.conflicts) missingFields.push("Противоречия")
                if (!quizAnswers.answerDepth) missingFields.push("Глубина")
                if (!quizAnswers.format) missingFields.push("Оформление")
                if (!quizAnswers.fallback) missingFields.push("Fallback")
                if (!quizAnswers.fewShot) missingFields.push("Пример")

                if (missingFields.length > 0) {
                    toast.error("Заполните все поля квиза", {
                        description: `Не заполнено: ${missingFields.join(", ")}`
                    })
                    return
                }

                if (quizAnswers.identityName.length < 2) {
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
                    // Filter out empty string values from quizAnswers
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
                    toast.success("Агент создан! Переходим к загрузке знаний...", {
                        duration: 2000
                    })
                    // Don't close dialog, move to next step (Knowledge)
                    // setOpen(false) 
                    // router.push... NO, we continue wizard
                } else {
                    return // stay on step if failed
                }
            }
        }

        // Step 2: Knowledge -> Step 3: Review
        // нельзя идти дальше если есть несохранённые чанки
        if (step === 2 && chunks.length > 0 && !chunksSaved) {
            toast.error('Сохраните чанки перед тем как продолжить')
            return
        }
        setStep((prev) => Math.min(prev + 1, steps.length))
    }

    // Создание агента через API
    const createAgent = async (): Promise<string | null> => {
        setIsCreatingAgent(true)

        try {
            const orchestratorUrl = process.env.NEXT_PUBLIC_AGENT_ORCHESTRATOR_URL

            if (!orchestratorUrl) {
                // Mock если нет URL
                const mockId = 'mock_agent_' + Date.now()
                setCreatedAgentId(mockId)
                toast.info('Агент создан (mock)')
                return mockId
            }

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
                    await fetch(`${orchestratorUrl}/api/v1/agents/${data.id}/prompts`, {
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

            // Build guardrails array from quiz constraints (format: { rule: string })
            const guardrails = [
                ...quizAnswers.constraints.map(id => constraintLabels[id] || id),
                ...quizAnswers.customConstraints
            ].filter(Boolean).map(constraint => ({ rule: constraint }))

            // Get tone of voice value as array
            const toneValue = quizAnswers.toneOfVoice === 'custom'
                ? quizAnswers.toneOfVoiceCustom
                : quizAnswers.toneOfVoice
            const toneArray = toneValue ? [toneValue] : ['friendly']

            try {
                await fetch(`${orchestratorUrl}/api/v1/agents/${data.id}/behavior`, {
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
        if (step === 2 && chunks.length > 0 && !chunksSaved) return false
        return true
    }

    const prevStep = () => {
        setStep((prev) => Math.max(prev - 1, 1))
    }

    const handleGeneratePersona = async () => {
        const name = form.getValues("name")
        const role = form.getValues("role")
        const desc = form.getValues("description")

        if (!desc) {
            toast.error(tCommon('error'), { description: t('enterDescFirst') })
            return
        }

        setIsGenerating(true)

        // Helper function to generate mock prompt
        const generateMockPrompt = () => {
            const roleName = role === 'corporate_bot' ? 'Корпоративный бот' : role
            return `Ты — ${name || 'AI-ассистент'}, ${roleName || 'помощник'}.

${desc}

Основные обязанности:
- Консультировать по вопросам компании
- Помогать найти нужную информацию
- Отвечать на часто задаваемые вопросы

Правила общения:
- Отвечай вежливо и профессионально
- Будь кратким, но информативным
- Если не знаешь ответа — честно признайся
- Не выходи за рамки своей роли
- Не обсуждай конкурентов и политику

Формат ответов:
- Используй структурированные ответы с абзацами
- При необходимости используй списки
- Всегда предлагай дополнительную помощь`
        }

        try {
            // Use local proxy
            const response = await fetch('/api/ai/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    agentName: name,
                    role: role === 'corporate_bot' ? 'Корпоративный бот' : role,
                    description: desc
                }),
            })

            if (!response.ok) {
                console.error("Generation failed code:", response.status)
                throw new Error("Failed to generate")
            }

            const data = await response.json()

            if (data.systemPrompt || data.prompt) {
                form.setValue("systemPrompt", data.systemPrompt || data.prompt)
                toast.success(t('promptGenerated'))
            } else {
                throw new Error("No prompt in response")
            }

        } catch (error) {
            console.warn("Auto-generation failed, using mock:", error)
            form.setValue("systemPrompt", generateMockPrompt())
            toast.info("Сгенерировано по шаблону (AI недоступен)")
        } finally {
            setIsGenerating(false)
        }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploadedFiles(prev => [...prev, { name: file.name, file }])
        setIsParsing(true)

        try {
            const gatewayUrl = process.env.NEXT_PUBLIC_AI_GATEWAY_URL

            if (!gatewayUrl) {
                // Mock chunks if no gateway
                const mockChunks = [
                    { id: '1', content: `Содержимое файла ${file.name} (mock)` },
                    { id: '2', content: 'Это пример чанка для демонстрации.' },
                ]
                setChunks(prev => [...prev, ...mockChunks])
                toast.info('Сгенерированы тестовые чанки (AI Gateway не настроен)')
                setIsParsing(false)
                return
            }

            const formData = new FormData()
            formData.append('file', file)

            const response = await fetch(`${gatewayUrl}/api/v1/documents/parse-semantic`, {
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
            const gatewayUrl = process.env.NEXT_PUBLIC_AI_GATEWAY_URL

            if (!gatewayUrl) {
                setChunksSaved(true)
                toast.success('Чанки сохранены (mock)')
                setIsSavingChunks(false)
                return
            }

            const response = await fetch(`${gatewayUrl}/api/v1/documents/vectorize`, {
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
                    <Progress value={(step / 3) * 100} className="h-2" />
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto px-1 py-4">
                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div
                                key="step1"
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

                        {step === 2 && (
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

                        {step === 3 && (
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
                            <Button variant="ghost" onClick={prevStep}>
                                <ChevronLeft className="mr-2 h-4 w-4" />
                                {t('back')}
                            </Button>
                            {step < 3 ? (
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
            </DialogContent>
        </Dialog>
    )
}
