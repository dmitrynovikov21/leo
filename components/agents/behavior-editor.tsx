"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { User, Shield, Plus, X, Wand2, FileText, Loader2, RefreshCw, Send, Bug, Sparkles } from "lucide-react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

import { Button } from "@/components/ui/button"
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
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useUserData } from "@/components/providers/user-data-provider"
import { TelegramConnectionDialog } from "@/components/agents/telegram-connection-dialog"

// XML Block Editor helpers
interface XmlBlock {
    id: string
    type: 'xml' | 'text'
    tag?: string
    content: string
}

function parseXmlBlocks(text: string): XmlBlock[] {
    if (!text) return []

    const blocks: XmlBlock[] = []
    const regex = /<(\w[\w-]*)>([\s\S]*?)<\/\1>/g
    let lastIndex = 0
    let match
    let id = 0

    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            const between = text.slice(lastIndex, match.index).trim()
            if (between) {
                blocks.push({ id: `t${id++}`, type: 'text', content: between })
            }
        }
        const inner = match[2].replace(/^\n/, '').replace(/\n$/, '')
        blocks.push({ id: `x${id++}`, type: 'xml', tag: match[1], content: inner })
        lastIndex = match.index + match[0].length
    }

    if (lastIndex < text.length) {
        const remaining = text.slice(lastIndex).trim()
        if (remaining) {
            blocks.push({ id: `t${id++}`, type: 'text', content: remaining })
        }
    }

    return blocks
}

function hasXmlStructure(text: string): boolean {
    if (!text) return false
    return /<(\w[\w-]*)>[\s\S]*?<\/\1>/.test(text)
}

function assembleFromBlocks(blocks: XmlBlock[]): string {
    return blocks.map(b => {
        if (b.type === 'xml' && b.tag) {
            return `<${b.tag}>\n${b.content}\n</${b.tag}>`
        }
        return b.content
    }).join('\n\n')
}

function XmlBlockEditor({ value, onChange }: { value: string; onChange: (val: string) => void }) {
    const [blocks, setBlocks] = React.useState<XmlBlock[]>(() =>
        hasXmlStructure(value) ? parseXmlBlocks(value) : []
    )
    const assembledRef = React.useRef(value)
    const isXml = hasXmlStructure(value) || blocks.some(b => b.type === 'xml')

    React.useEffect(() => {
        if (value !== assembledRef.current) {
            if (hasXmlStructure(value)) {
                setBlocks(parseXmlBlocks(value))
            } else {
                setBlocks([])
            }
            assembledRef.current = value
        }
    }, [value])

    const updateBlock = React.useCallback((blockId: string, newContent: string) => {
        setBlocks(prev => {
            const updated = prev.map(b => b.id === blockId ? { ...b, content: newContent } : b)
            const assembled = assembleFromBlocks(updated)
            assembledRef.current = assembled
            onChange(assembled)
            return updated
        })
    }, [onChange])

    if (!isXml) {
        return (
            <Textarea
                className="min-h-[450px] font-mono text-sm leading-relaxed border-transparent bg-muted/50 focus:bg-card focus:ring-2 focus:ring-ring transition-all rounded-xl resize-none text-foreground"
                value={value}
                onChange={(e) => {
                    assembledRef.current = e.target.value
                    onChange(e.target.value)
                }}
            />
        )
    }

    return (
        <div className="space-y-3">
            {blocks.map((block) => {
                const lineCount = block.content.split('\n').length
                const minH = block.type === 'xml'
                    ? Math.max(80, Math.min(lineCount * 22 + 32, 400))
                    : Math.max(60, Math.min(lineCount * 22 + 32, 200))

                return (
                    <div key={block.id} className="space-y-0">
                        {block.type === 'xml' && block.tag && (
                            <div className="font-mono text-xs text-muted-foreground/60 px-1 select-none">
                                &lt;{block.tag}&gt;
                            </div>
                        )}
                        <Textarea
                            className="font-mono text-sm leading-relaxed border-transparent bg-muted/50 focus:bg-card focus:ring-2 focus:ring-ring transition-all rounded-xl resize-vertical text-foreground"
                            style={{ minHeight: minH }}
                            value={block.content}
                            onChange={(e) => updateBlock(block.id, e.target.value)}
                        />
                        {block.type === 'xml' && block.tag && (
                            <div className="font-mono text-xs text-muted-foreground/60 px-1 select-none">
                                &lt;/{block.tag}&gt;
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}

// Types
interface PromptVersion {
    id: string
    version: string
    isActive: boolean
    createdAt: string
}

interface BehaviorData {
    avatarEmoji: string
    displayName: string
    temperature: number
    systemPrompt: string
    tone: string[]
    guardrails: { rule: string }[]
    welcomeMessage?: string
}

interface PromptsData {
    versions: PromptVersion[]
    activePrompt: {
        id: string
        content: string
    } | null
}

// Schema
const behaviorSchema = z.object({
    displayName: z.string().min(2),
    avatarEmoji: z.string(),
    temperature: z.number().min(0).max(1),
    showSources: z.boolean(),
    systemPrompt: z.string(),
    tone: z.array(z.string()),
    guardrails: z.array(z.object({ rule: z.string() })),
    welcomeMessage: z.string().optional(),
})

type BehaviorFormData = z.infer<typeof behaviorSchema>

export function BehaviorEditor({ agentId }: { agentId: string }) {
    const t = useTranslations('Behavior')
    const tCommon = useTranslations('Common')

    const toneOptions = [
        { value: "official", label: t('official') },
        { value: "friendly", label: t('friendly') },
        { value: "professional", label: t('professional') },
        { value: "concise", label: t('concise') },
        { value: "humorous", label: t('humorous') },
        { value: "empathetic", label: t('empathetic') },
        { value: "formal", label: t('formal') },
        { value: "casual", label: t('casual') },
    ]

    const [isLoading, setIsLoading] = React.useState(true)
    const [error, setError] = React.useState<string | null>(null)
    const [promptVersions, setPromptVersions] = React.useState<PromptVersion[]>([])
    const [selectedVersionId, setSelectedVersionId] = React.useState<string | null>(null)
    const [showRestartDialog, setShowRestartDialog] = React.useState(false)
    const [isRestarting, setIsRestarting] = React.useState(false)
    const [isNewVersion, setIsNewVersion] = React.useState(false)

    // AI generation state
    const [isGenerating, setIsGenerating] = React.useState(false)

    // Debug prompts state
    const [platformPrompt, setPlatformPrompt] = React.useState<string | null>(null)
    const [promptPreview, setPromptPreview] = React.useState<string | null>(null)
    const [isLoadingDebug, setIsLoadingDebug] = React.useState(false)
    const [debugTab, setDebugTab] = React.useState<string>("platform")

    // Check Telegram connection
    const { agents, refreshAgents } = useUserData()
    const agent = agents.find(a => a.id === agentId)
    const [showTelegramModal, setShowTelegramModal] = React.useState(false)

    // Conversation examples (stored separately via Prisma)
    const [conversationExamples, setConversationExamples] = React.useState("")
    const conversationExamplesRef = React.useRef("")

    // Refs for version state (accessible in unmount/autosave)
    const selectedVersionIdRef = React.useRef<string | null>(null)
    const isNewVersionRef = React.useRef(false)
    const promptVersionsRef = React.useRef<PromptVersion[]>([])

    React.useEffect(() => { selectedVersionIdRef.current = selectedVersionId }, [selectedVersionId])
    React.useEffect(() => { isNewVersionRef.current = isNewVersion }, [isNewVersion])
    React.useEffect(() => { promptVersionsRef.current = promptVersions }, [promptVersions])

    // Autosave timer
    const autosaveTimerRef = React.useRef<NodeJS.Timeout | null>(null)
    const AUTOSAVE_INTERVAL = 30000 // 30 seconds
    const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false)
    const hasUnsavedChangesRef = React.useRef(false)

    // Keep ref in sync with state for cleanup access
    React.useEffect(() => {
        hasUnsavedChangesRef.current = hasUnsavedChanges
    }, [hasUnsavedChanges])

    // Cleanup autosave timer on unmount + save unsaved changes
    React.useEffect(() => {
        return () => {
            if (autosaveTimerRef.current) {
                clearTimeout(autosaveTimerRef.current)
            }
            // Save on unmount if there are unsaved changes (fire-and-forget)
            if (hasUnsavedChangesRef.current) {
                const data = form.getValues()
                fetch(`/api/orchestrator/agents/${agentId}/behavior`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        displayName: data.displayName,
                        temperature: data.temperature,
                        showSources: data.showSources,
                        tone: data.tone,
                        guardrails: data.guardrails,
                        welcomeMessage: data.welcomeMessage,
                    }),
                }).catch(() => {})
                // Save conversation examples separately via Prisma
                if (conversationExamplesRef.current !== undefined) {
                    fetch(`/api/agents/${agentId}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ conversationExamples: conversationExamplesRef.current }),
                    }).catch(() => {})
                }
                // Save system prompt (fire-and-forget)
                if (data.systemPrompt) {
                    if (isNewVersionRef.current) {
                        const nextVersion = getNextVersion(promptVersionsRef.current)
                        fetch(`/api/orchestrator/agents/${agentId}/prompts`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                version: nextVersion,
                                content: data.systemPrompt,
                                isActive: true,
                            }),
                        }).catch(() => {})
                    } else if (selectedVersionIdRef.current) {
                        fetch(`/api/orchestrator/agents/${agentId}/prompts/${selectedVersionIdRef.current}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ content: data.systemPrompt }),
                        }).catch(() => {})
                    }
                }
            }
        }
    }, [])

    // Calculate next version number (1.0 -> 1.1 -> ... -> 1.9 -> 2.0)
    const getNextVersion = (versions: PromptVersion[]): string => {
        if (versions.length === 0) return 'v1.0'

        const versionNumbers = versions
            .map(v => v.version.replace('v', ''))
            .map(v => parseFloat(v))
            .filter(v => !isNaN(v))

        const maxVersion = Math.max(...versionNumbers)
        const major = Math.floor(maxVersion)
        const minor = Math.round((maxVersion - major) * 10)

        if (minor >= 9) {
            return `v${major + 1}.0`
        }
        return `v${major}.${minor + 1}`
    }

    const defaultValues: BehaviorFormData = {
        displayName: "",
        avatarEmoji: "😊",
        temperature: 0.5,
        showSources: false,
        systemPrompt: "",
        tone: [],
        guardrails: [],
    }

    const form = useForm<BehaviorFormData>({
        resolver: zodResolver(behaviorSchema),
        defaultValues,
        mode: "onChange",
    })

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "guardrails",
    })

    // Watch form changes for autosave
    const watchedValues = form.watch()

    React.useEffect(() => {
        // Skip during initial load
        if (isLoading) return

        setHasUnsavedChanges(true)

        // Reset autosave timer
        if (autosaveTimerRef.current) {
            clearTimeout(autosaveTimerRef.current)
        }

        autosaveTimerRef.current = setTimeout(() => {
            const data = form.getValues()
            handleAutosave(data)
        }, AUTOSAVE_INTERVAL)

    }, [JSON.stringify(watchedValues), conversationExamples, isLoading])

    const handleAutosave = async (data: BehaviorFormData) => {
        if (!hasUnsavedChanges) return

        try {
            // Save behavior settings silently
            await fetch(`/api/orchestrator/agents/${agentId}/behavior`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    displayName: data.displayName,
                    temperature: data.temperature,
                    showSources: data.showSources,
                    tone: data.tone,
                    guardrails: data.guardrails,
                    welcomeMessage: data.welcomeMessage,
                }),
            })

            // Save conversation examples
            await fetch(`/api/agents/${agentId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ conversationExamples: conversationExamples }),
            })

            // Save system prompt
            if (data.systemPrompt) {
                if (isNewVersion) {
                    const nextVersion = getNextVersion(promptVersions)
                    const promptRes = await fetch(`/api/orchestrator/agents/${agentId}/prompts`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            version: nextVersion,
                            content: data.systemPrompt,
                            isActive: true,
                        }),
                    })
                    if (promptRes.ok) {
                        // Reload versions
                        const promptsRes = await fetch(`/api/orchestrator/agents/${agentId}/prompts`)
                        if (promptsRes.ok) {
                            const promptsData: PromptsData = await promptsRes.json()
                            setPromptVersions(promptsData.versions || [])
                            const activeVersion = promptsData.versions?.find(v => v.isActive)
                            if (activeVersion) {
                                setSelectedVersionId(activeVersion.id)
                            }
                        }
                        setIsNewVersion(false)
                    }
                } else if (selectedVersionId) {
                    await fetch(`/api/orchestrator/agents/${agentId}/prompts/${selectedVersionId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ content: data.systemPrompt }),
                    })
                }
            }

            setHasUnsavedChanges(false)
            toast.success("Автосохранение", { description: "Изменения поведения сохранены" })
        } catch (err) {
            console.error("Autosave error:", err)
            // Silent fail for autosave
        }
    }

    // Load behavior data
    React.useEffect(() => {
        const loadBehaviorData = async () => {
            try {
                setIsLoading(true)
                setError(null)

                // Fetch behavior data
                const behaviorRes = await fetch(`/api/orchestrator/agents/${agentId}/behavior`)
                if (!behaviorRes.ok) {
                    throw new Error(`Failed to load behavior: ${behaviorRes.status}`)
                }
                const behaviorData: BehaviorData = await behaviorRes.json()

                // Fetch prompt versions
                const promptsRes = await fetch(`/api/orchestrator/agents/${agentId}/prompts`)
                let activePromptContent = ""
                if (promptsRes.ok) {
                    const promptsData: PromptsData = await promptsRes.json()
                    setPromptVersions(promptsData.versions || [])
                    const activeVersion = promptsData.versions?.find(v => v.isActive)
                    if (activeVersion) {
                        setSelectedVersionId(activeVersion.id)
                    }
                    if (promptsData.activePrompt?.content) {
                        activePromptContent = promptsData.activePrompt.content
                    }
                }

                // Load conversation examples from agent data
                const agentData = agents.find(a => a.id === agentId)
                if (agentData?.conversationExamples) {
                    setConversationExamples(agentData.conversationExamples)
                    conversationExamplesRef.current = agentData.conversationExamples
                }

                // Update form with loaded data
                form.reset({
                    displayName: behaviorData.displayName || "",
                    avatarEmoji: behaviorData.avatarEmoji || "😊",
                    temperature: behaviorData.temperature ?? 0.5,
                    showSources: (behaviorData as any).showSources ?? false,
                    systemPrompt: activePromptContent || behaviorData.systemPrompt || "",
                    tone: behaviorData.tone || [],
                    guardrails: behaviorData.guardrails || [],
                    welcomeMessage: behaviorData.welcomeMessage || "",
                })
            } catch (err) {
                console.error("Error loading behavior:", err)
                setError(err instanceof Error ? err.message : "Failed to load behavior data")
            } finally {
                setIsLoading(false)
            }
        }

        loadBehaviorData()
    }, [agentId, form])

    // Load debug prompts
    const loadDebugPrompts = React.useCallback(async () => {
        setIsLoadingDebug(true)
        try {
            // Load platform core prompt
            const platformRes = await fetch(`/api/gateway/system-prompts/platform_core`)
            if (platformRes.ok) {
                const data = await platformRes.json()
                setPlatformPrompt(data.content || data.prompt || null)
            }

            // Load assembled prompt preview
            const previewRes = await fetch(`/api/gateway/system-prompts/agents/${agentId}/prompt-preview`)
            if (previewRes.ok) {
                const data = await previewRes.json()
                setPromptPreview(data.fullPrompt || data.preview || data.prompt || data.content || null)
            }
        } catch (err) {
            console.error("Error loading debug prompts:", err)
        } finally {
            setIsLoadingDebug(false)
        }
    }, [agentId])

    // Load debug prompts on mount
    React.useEffect(() => {
        loadDebugPrompts()
    }, [loadDebugPrompts])

    const handleRestart = async () => {
        // Check Telegram connection first
        if (!agent?.isTelegramConnected) {
            setShowRestartDialog(false)
            setShowTelegramModal(true)
            return
        }

        setIsRestarting(true)
        try {
            // Stop the agent
            await fetch(`/api/orchestrator/agents/${agentId}/stop`, { method: 'POST' })

            // Start the agent
            await fetch(`/api/orchestrator/agents/${agentId}/start`, { method: 'POST' })

            // Poll for running status
            for (let i = 0; i < 5; i++) {
                await new Promise(r => setTimeout(r, 1000))
                const statusRes = await fetch(`/api/orchestrator/agents/${agentId}/status`)
                if (statusRes.ok) {
                    const statusData = await statusRes.json()
                    const newStatus = statusData.agent?.status || statusData.status
                    if (newStatus === 'RUNNING') break
                }
            }

            toast.success("Агент успешно перезапущен")
            setShowRestartDialog(false)
        } catch (error) {
            console.error("Restart error:", error)
            toast.error("Ошибка при перезапуске агента")
        } finally {
            setIsRestarting(false)
        }
    }

    const handleVersionChange = async (versionId: string) => {
        // Handle selecting "new" version
        if (versionId === 'new') {
            setIsNewVersion(true)
            setSelectedVersionId(null)
            form.setValue("systemPrompt", "", { shouldDirty: true })
            return
        }

        if (!versionId) return

        setIsNewVersion(false)
        setSelectedVersionId(versionId)

        try {
            // Activate the selected version
            const res = await fetch(
                `/api/orchestrator/agents/${agentId}/prompts/${versionId}/activate`,
                { method: "PATCH" }
            )

            if (res.ok) {
                // Reload prompt content and versions
                const promptsRes = await fetch(`/api/orchestrator/agents/${agentId}/prompts`)
                if (promptsRes.ok) {
                    const promptsData: PromptsData = await promptsRes.json()
                    setPromptVersions(promptsData.versions || [])
                    if (promptsData.activePrompt) {
                        form.setValue("systemPrompt", promptsData.activePrompt.content, { shouldDirty: false })
                    }
                }
                toast.success("Версия активирована")
            }
        } catch (err) {
            console.error("Error switching version:", err)
            toast.error("Не удалось переключить версию")
        }
    }

    const handleGeneratePrompt = async () => {
        const data = form.getValues()
        const agentData = agents.find(a => a.id === agentId)

        setIsGenerating(true)
        try {
            const res = await fetch("/api/ai/generate-agent-prompt", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    agentName: data.displayName || agentData?.name || "Агент",
                    wizardV2: {
                        businessDescription: agentData?.description || agentData?.role || "",
                        restrictions: data.guardrails?.map(g => g.rule).filter(Boolean),
                        selectedStyle: data.tone?.length ? { label: data.tone.join(", ") } : undefined,
                        responseLength: data.temperature > 0.6 ? "detailed" : "short",
                        showSources: data.showSources,
                    },
                }),
            })

            if (res.ok) {
                const result = await res.json()
                const prompt = result.systemPrompt || result.prompt || result.choices?.[0]?.message?.content || ""
                if (prompt) {
                    form.setValue("systemPrompt", prompt, { shouldDirty: true })
                    setHasUnsavedChanges(true)
                    toast.success("Инструкция сгенерирована")
                }
            } else if (res.status === 402) {
                toast.error("Отрицательный баланс PU", {
                    description: "Пополните баланс в разделе Биллинг, чтобы продолжить."
                })
            } else {
                toast.error("Не удалось сгенерировать инструкцию")
            }
        } catch (err) {
            console.error("Prompt generation failed:", err)
            toast.error("Ошибка генерации")
        } finally {
            setIsGenerating(false)
        }
    }

    // Loading state
    if (isLoading) {
        return (
            <div className="max-w-4xl space-y-8">
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-72" />
                    </div>
                    <Skeleton className="h-10 w-32" />
                </div>
                <Separator />
                <Skeleton className="h-24 w-full rounded-2xl" />
                <Skeleton className="h-32 w-full rounded-2xl" />
                <Skeleton className="h-48 w-full rounded-2xl" />
            </div>
        )
    }

    // Error state
    if (error) {
        return (
            <div className="max-w-4xl">
                <Card className="border-red-200 bg-red-50">
                    <CardContent className="p-6">
                        <p className="text-red-700">{error}</p>
                        <Button
                            variant="outline"
                            className="mt-4"
                            onClick={() => window.location.reload()}
                        >
                            Повторить
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="max-w-4xl">
            <div className="space-y-8 pb-20">
                <div className="space-y-8">

                    {/* Header */}
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">{t('title')}</h2>
                        <p className="text-muted-foreground">{t('description')}</p>
                    </div>

                    <Separator />

                    {/* 1. Identity Block */}
                    <section className="space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <User className="h-5 w-5" /> {t('identity')}
                        </h3>
                        <Card className="border border-border shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-card rounded-2xl">
                            <CardContent className="p-4 space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="flex-1">
                                        <Label className="sr-only">{t('displayName')}</Label>
                                        <Input
                                            {...form.register("displayName")}
                                            placeholder={t('displayName')}
                                            className="h-10 rounded-xl border-transparent bg-muted/50 focus:bg-card focus:ring-2 focus:ring-ring transition-all font-medium text-foreground placeholder:text-muted-foreground"
                                        />
                                    </div>
                                </div>
                                {/* Welcome Message */}
                                <div>
                                    <Label htmlFor="welcomeMessage" className="text-sm font-medium text-foreground mb-2 block">
                                        Приветственное сообщение
                                    </Label>
                                    <Textarea
                                        {...form.register("welcomeMessage")}
                                        id="welcomeMessage"
                                        placeholder="Введите сообщение, которое бот отправит при старте диалога..."
                                        className="min-h-[80px] rounded-xl border-transparent bg-muted/50 focus:bg-card focus:ring-2 focus:ring-ring transition-all font-medium text-foreground resize-none"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Это сообщение будет автоматически отправлено пользователю при начале нового диалога
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </section>

                    {/* 2. Parameters */}
                    <section className="space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Wand2 className="h-5 w-5" /> {t('cognitiveSettings')}
                        </h3>
                        <Card className="border border-border shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-card rounded-2xl">
                            <CardContent className="pt-6 pb-6 space-y-6">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-foreground font-medium">{t('creativity')}</Label>
                                        <Badge variant="outline" className="text-xs font-mono rounded-lg border-border bg-muted/50 text-muted-foreground">
                                            {form.watch("temperature")}
                                        </Badge>
                                    </div>
                                    <Slider
                                        value={[form.watch("temperature")]}
                                        max={1}
                                        min={0}
                                        step={0.1}
                                        onValueChange={(val) => form.setValue("temperature", val[0], { shouldDirty: true })}
                                        className="cursor-pointer"
                                    />
                                    <div className="flex justify-between text-xs text-muted-foreground px-1 font-medium">
                                        <span>{t('strict')} (0.0)</span>
                                        <span>{t('balanced')} (0.5)</span>
                                        <span>{t('creative')} (1.0)</span>
                                    </div>
                                </div>

                                <Separator />

                                {/* Show Sources Toggle */}
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-foreground font-medium">Показывать источники</Label>
                                        <p className="text-xs text-muted-foreground">
                                            Агент будет указывать файл-источник в ответе
                                        </p>
                                    </div>
                                    <Switch
                                        checked={form.watch("showSources")}
                                        onCheckedChange={(checked) => form.setValue("showSources", checked, { shouldDirty: true })}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </section>

                    {/* 3. System Instructions */}
                    <section className="space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <FileText className="h-5 w-5" /> {t('systemInstructions')}
                        </h3>

                        {/* Debug: Platform Prompts */}
                        <Card className="border border-amber-200/50 bg-amber-50/30 shadow-none rounded-2xl">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-amber-800 flex items-center gap-2">
                                    <Bug className="h-4 w-4" />
                                    Debug: Системные промпты
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <Tabs value={debugTab} onValueChange={setDebugTab}>
                                    <TabsList className="bg-amber-100/50 p-1 rounded-xl h-9 mb-3">
                                        <TabsTrigger
                                            value="platform"
                                            className="rounded-lg text-xs font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm"
                                        >
                                            Техническая инструкция
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="preview"
                                            className="rounded-lg text-xs font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm"
                                        >
                                            Собранный промпт
                                        </TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="platform" className="mt-0">
                                        {isLoadingDebug ? (
                                            <Skeleton className="h-32 w-full rounded-xl" />
                                        ) : platformPrompt ? (
                                            <div className="bg-card border border-amber-200/50 rounded-xl p-4">
                                                <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                                                    {platformPrompt}
                                                </pre>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-amber-600 italic">Техническая инструкция не загружена</p>
                                        )}
                                    </TabsContent>
                                    <TabsContent value="preview" className="mt-0">
                                        {isLoadingDebug ? (
                                            <Skeleton className="h-32 w-full rounded-xl" />
                                        ) : promptPreview ? (
                                            <div className="bg-card border border-amber-200/50 rounded-xl p-4">
                                                <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                                                    {promptPreview}
                                                </pre>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-amber-600 italic">Собранный промпт недоступен</p>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={loadDebugPrompts}
                                            disabled={isLoadingDebug}
                                            className="mt-2 text-xs text-amber-700 hover:text-amber-900 hover:bg-amber-100"
                                        >
                                            <RefreshCw className={cn("h-3 w-3 mr-1", isLoadingDebug && "animate-spin")} />
                                            Обновить
                                        </Button>
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>

                        {/* Role Definition */}
                        <Card className="border border-border shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-card rounded-2xl">
                            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                                <div className="space-y-1">
                                    <CardTitle className="text-base text-foreground">{t('roleDefinition')}</CardTitle>
                                    <CardDescription className="text-muted-foreground">{t('roleDefinitionDesc')}</CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-9 rounded-xl text-xs font-medium"
                                        onClick={handleGeneratePrompt}
                                        disabled={isGenerating}
                                    >
                                        {isGenerating ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
                                        Сгенерировать
                                    </Button>
                                    <Select
                                        value={isNewVersion ? 'new' : (selectedVersionId || undefined)}
                                        onValueChange={handleVersionChange}
                                    >
                                    <SelectTrigger className="w-[140px] h-9 text-xs border-transparent bg-muted/50 hover:bg-muted transition-all rounded-xl focus:ring-0">
                                        <SelectValue placeholder="Выберите версию" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {promptVersions.map((v) => (
                                            <SelectItem key={v.id} value={v.id}>
                                                <span className="flex items-center gap-2">
                                                    <span>{v.version}</span>
                                                    {v.isActive && (
                                                        <Badge variant="secondary" className="text-[10px] h-4 px-1 py-0 border-0 bg-green-500/10 text-green-600 rounded-md">
                                                            Активная
                                                        </Badge>
                                                    )}
                                                </span>
                                            </SelectItem>
                                        ))}
                                        {/* NEW version option */}
                                        <SelectItem value="new">
                                            <span className="flex items-center gap-2">
                                                <span>{getNextVersion(promptVersions)}</span>
                                                <Badge variant="secondary" className="text-[10px] h-4 px-1.5 py-0 border-0 bg-blue-500/10 text-blue-600 rounded-md font-semibold">
                                                    НОВАЯ
                                                </Badge>
                                            </span>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                </div>
                            </CardHeader>
                            <CardContent className="pb-6">
                                <Textarea
                                    value={form.watch("systemPrompt")}
                                    onChange={(e) => form.setValue("systemPrompt", e.target.value, { shouldDirty: true })}
                                    className="min-h-[300px] font-mono text-sm resize-y"
                                    placeholder="Системная инструкция агента..."
                                />
                            </CardContent>
                        </Card>

                        {/* Tone of Voice */}
                        <Card className="border border-border shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-card rounded-2xl">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base text-foreground">{t('toneOfVoice')}</CardTitle>
                            </CardHeader>
                            <CardContent className="pb-6">
                                <div className="flex flex-wrap gap-2">
                                    {toneOptions.map((tone) => {
                                        const currentTones = form.watch("tone")
                                        const isSelected = currentTones.includes(tone.value)
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
                                                onClick={() => {
                                                    if (isSelected) {
                                                        form.setValue("tone", currentTones.filter(t => t !== tone.value))
                                                    } else {
                                                        form.setValue("tone", [...currentTones, tone.value])
                                                    }
                                                }}
                                            >
                                                {tone.label}
                                            </button>
                                        )
                                    })}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Guardrails */}
                        <Card className="border border-border shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-card rounded-2xl">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base text-foreground flex items-center justify-between">
                                    <span>{t('guardrails')}</span>
                                    <Badge variant="secondary" className="font-normal text-xs text-muted-foreground bg-muted border-0 rounded-lg px-2 shadow-none">
                                        {fields.length} {t('activeRules')}
                                    </Badge>
                                </CardTitle>
                                <CardDescription className="text-muted-foreground">{t('guardrailsDesc')}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3 pb-6">
                                {fields.map((field, index) => (
                                    <div key={field.id} className="flex items-center gap-2">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 border border-red-100">
                                            <Shield className="h-4 w-4" />
                                        </div>
                                        <Input
                                            {...form.register(`guardrails.${index}.rule` as const)}
                                            placeholder={t('newGuardrailRule')}
                                            className="flex-1 border-transparent bg-muted/50 focus:bg-card focus:ring-2 focus:ring-ring transition-all rounded-xl text-foreground"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => remove(index)}
                                            className="text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="w-full mt-2 border-border bg-card hover:bg-muted/50 hover:border-border text-muted-foreground rounded-xl shadow-none h-10 border-dashed"
                                    onClick={() => append({ rule: '' })}
                                >
                                    <Plus className="h-4 w-4 mr-2" /> {t('addGuardrail')}
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Conversation Examples */}
                        <Card className="border border-border shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-card rounded-2xl">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base text-foreground">Эталонный пример</CardTitle>
                                <CardDescription className="text-muted-foreground">
                                    Приведите пример идеального диалога. Он будет добавлен в системную инструкцию агента.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pb-6">
                                <Textarea
                                    value={conversationExamples}
                                    onChange={(e) => {
                                        setConversationExamples(e.target.value)
                                        conversationExamplesRef.current = e.target.value
                                        setHasUnsavedChanges(true)
                                    }}
                                    placeholder={"Пользователь: Как оформить отпуск?\nАгент: Для оформления отпуска нужно:\n1. Зайти на портал...\n2. Заполнить форму..."}
                                    className="min-h-[140px] rounded-xl border-transparent bg-muted/50 focus:bg-card focus:ring-2 focus:ring-ring transition-all text-foreground resize-none"
                                />
                            </CardContent>
                        </Card>
                    </section>
                </div>
            </div>

            {/* Restart Dialog */}
            <Dialog open={showRestartDialog} onOpenChange={setShowRestartDialog}>
                <DialogContent className="sm:max-w-[400px] rounded-2xl p-6 border-border shadow-xl">
                    <DialogHeader className="text-center">
                        <div className="mx-auto h-16 w-16 rounded-full bg-yellow-100 flex items-center justify-center mb-4">
                            <RefreshCw className="h-8 w-8 text-yellow-600" />
                        </div>
                        <DialogTitle className="text-xl font-bold text-foreground">
                            Требуется перезапуск
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground mt-2">
                            Изменения сохранены. Чтобы они вступили в силу, нужно перезапустить агента.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-2 mt-6">
                        <Button
                            variant="outline"
                            className="flex-1 rounded-xl h-11"
                            onClick={() => setShowRestartDialog(false)}
                        >
                            Позже
                        </Button>
                        <Button
                            className="flex-1 rounded-xl h-11 bg-yellow-500 hover:bg-yellow-600 text-white"
                            onClick={handleRestart}
                            disabled={isRestarting}
                        >
                            {isRestarting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isRestarting ? "Перезапуск..." : "Перезапустить"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Telegram Required Modal */}
            <Dialog open={showTelegramModal} onOpenChange={setShowTelegramModal}>
                <DialogContent className="sm:max-w-[450px] rounded-2xl p-6 border-border shadow-xl">
                    <DialogHeader className="text-center">
                        <div className="mx-auto h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                            <Send className="h-8 w-8 text-blue-600" />
                        </div>
                        <DialogTitle className="text-xl font-bold text-foreground">
                            Подключите Telegram
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground mt-2">
                            Для перезапуска агента необходимо подключить Telegram бота.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4">
                        <TelegramConnectionDialog
                            agentId={agentId}
                            initialToken={agent?.telegramToken}
                            embedded
                            onSuccess={() => {
                                setShowTelegramModal(false)
                                refreshAgents()
                            }}
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
