"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { TelegramConnectionDialog } from "@/components/agents/telegram-connection-dialog"

import { useUserData } from "@/components/providers/user-data-provider"
import { Button } from "@/components/ui/button"
import { Loader2, Power, Play, Square, Send, Save, User, MessageSquare, HelpCircle, Shield } from "lucide-react"
import { toast } from "sonner"
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card"

import { useTranslations } from "next-intl"

interface Agent {
    id: string
    name: string
    description?: string
    status: string
    containerId?: string
    isTelegramConnected?: boolean
    telegramToken?: string
}

interface GeneralAgentSettingsContentProps {
    agentId: string
    agent: Agent | undefined
    onChange?: () => void
    onSave?: () => void
    isSaving?: boolean
}

export interface GeneralSettingsRef {
    getData: () => { name: string; description: string; emoji: string }
    isDirty: () => boolean
}

export const GeneralAgentSettingsContent = React.forwardRef<GeneralSettingsRef, GeneralAgentSettingsContentProps>(
    ({ agentId, agent, onChange, onSave, isSaving = false }, ref) => {
        const t = useTranslations('Agents')
        const { refreshAgents } = useUserData()
        const [emoji, setEmoji] = React.useState("🤖")
        const [pickerOpen, setPickerOpen] = React.useState(false)
        const [isLoading, setIsLoading] = React.useState(false)
        const [showTelegramModal, setShowTelegramModal] = React.useState(false)

        // Metadata state
        const [name, setName] = React.useState("")
        const [description, setDescription] = React.useState("")
        const [initialData, setInitialData] = React.useState({ name: "", description: "", emoji: "🤖" })

        React.useEffect(() => {
            if (agent) {
                setName(agent.name)
                setDescription(agent.description || "")
                setInitialData({ name: agent.name, description: agent.description || "", emoji: "🤖" })
            }
        }, [agent])

        // Expose methods via ref
        React.useImperativeHandle(ref, () => ({
            getData: () => ({ name, description, emoji }),
            isDirty: () => name !== initialData.name || description !== initialData.description || emoji !== initialData.emoji
        }))

        const handleEmojiClick = (emojiData: EmojiClickData) => {
            setEmoji(emojiData.emoji)
            setPickerOpen(false)
            onChange?.()
        }

        const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            setName(e.target.value)
            onChange?.()
        }

        const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            setDescription(e.target.value)
            onChange?.()
        }

        const handleToggleStatus = async () => {
            if (!agent) return

            const isRunning = agent.status === 'RUNNING'

            // If trying to start and no Telegram connected, show modal
            if (!isRunning && !agent.isTelegramConnected) {
                setShowTelegramModal(true)
                return
            }

            const action = isRunning ? 'stop' : 'start'
            const orchestratorUrl = process.env.NEXT_PUBLIC_AGENT_ORCHESTRATOR_URL

            setIsLoading(true)

            try {
                if (!orchestratorUrl) {
                    await new Promise(r => setTimeout(r, 1000))
                    toast.success(`Agent ${action}ed (Mock)`)
                    await refreshAgents()
                    return
                }

                const res = await fetch(`${orchestratorUrl}/api/v1/agents/${agent.id}/${action}`, {
                    method: 'POST'
                })

                if (!res.ok) throw new Error(`Failed to ${action} agent`)

                const data = await res.json()
                let newStatus = data.status

                if (action === 'start' && newStatus !== 'RUNNING') {
                    for (let i = 0; i < 5; i++) {
                        await new Promise(r => setTimeout(r, 1000))
                        const statusRes = await fetch(`${orchestratorUrl}/api/v1/agents/${agent.id}/status`)
                        if (statusRes.ok) {
                            const statusData = await statusRes.json()
                            newStatus = statusData.agent?.status || statusData.status
                            if (newStatus === 'RUNNING') break
                        }
                    }
                }

                await refreshAgents()
                toast.success(`Agent ${action === 'start' ? 'started' : 'stopped'} successfully`)

            } catch (error) {
                console.error(error)
                toast.error(`Failed to ${action} agent`)
            } finally {
                setIsLoading(false)
            }
        }

        if (!agent) {
            return <div>Agent not found</div>
        }

        const isRunning = agent.status === 'RUNNING'

        return (
            <div className="space-y-6">
                {/* Status Control Card - FIRST */}
                <Card className="border border-zinc-200/50 shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-white rounded-2xl">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${isRunning ? 'bg-emerald-100' : 'bg-zinc-100'}`}>
                                <Power className={`h-5 w-5 ${isRunning ? 'text-emerald-600' : 'text-zinc-500'}`} />
                            </div>
                            <div>
                                <h4 className="font-medium text-sm text-zinc-900">Status</h4>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs font-semibold ${isRunning ? 'text-emerald-600' : 'text-zinc-500'}`}>
                                        {agent.status === 'STARTING' ? t('starting') :
                                            agent.status === 'RUNNING' ? t('online') :
                                                agent.status === 'STOPPED' ? t('paused') : agent.status}
                                    </span>
                                    {agent.containerId && (
                                        <span className="text-[10px] text-zinc-400 font-mono">
                                            {agent.containerId.substring(0, 8)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <Button
                            onClick={handleToggleStatus}
                            disabled={isLoading}
                            variant={isRunning ? "destructive" : "default"}
                            className={isRunning ? "" : "bg-emerald-600 hover:bg-emerald-700"}
                            size="sm"
                        >
                            {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : isRunning ? (
                                <Square className="h-4 w-4 mr-2" />
                            ) : (
                                <Play className="h-4 w-4 mr-2" />
                            )}
                            {isRunning ? "Stop Agent" : "Start Agent"}
                        </Button>
                    </CardContent>
                </Card>

                {/* Info Header with Save Button - SECOND */}
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-zinc-900">Основная информация</h3>
                        <p className="text-sm text-zinc-500 mt-1">
                            Настройте имя агента, его аватар и описание.
                        </p>
                    </div>
                    <Button onClick={onSave} disabled={isSaving} className="rounded-xl">
                        {isSaving ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Сохранение...</>
                        ) : (
                            <><Save className="mr-2 h-4 w-4" /> Сохранить</>
                        )}
                    </Button>
                </div>

                <Card className="border border-zinc-200/50 shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-white rounded-2xl">
                    <CardContent className="p-4 space-y-4">
                        {/* Identity Row - Emoji + Name */}
                        <div className="flex items-center gap-4">
                            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                                <PopoverTrigger asChild>
                                    <button
                                        type="button"
                                        className="flex h-12 w-12 items-center justify-center rounded-xl shadow-sm bg-zinc-50 text-2xl hover:bg-zinc-100 hover:shadow-md transition-all duration-200 border border-zinc-100"
                                    >
                                        {emoji}
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-full border-none p-0 bg-transparent shadow-none" align="start">
                                    <div className="rounded-xl overflow-hidden border shadow-lg">
                                        <EmojiPicker
                                            onEmojiClick={handleEmojiClick}
                                            autoFocusSearch={false}
                                            theme={Theme.LIGHT}
                                            searchDisabled={false}
                                            width={320}
                                            height={400}
                                        />
                                    </div>
                                </PopoverContent>
                            </Popover>
                            <div className="flex-1">
                                <Label htmlFor="agent-name" className="sr-only">Имя агента</Label>
                                <Input
                                    id="agent-name"
                                    value={name}
                                    onChange={handleNameChange}
                                    placeholder="Имя агента"
                                    className="h-10 rounded-xl border-transparent bg-zinc-100/50 focus:bg-white focus:ring-2 focus:ring-zinc-200 transition-all font-medium text-zinc-900 placeholder:text-zinc-400"
                                />
                            </div>
                        </div>

                        {/* Description */}
                        {/* Description */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Label htmlFor="agent-desc" className="text-sm font-semibold text-zinc-700">Описание / Должность</Label>
                                <HoverCard>
                                    <HoverCardTrigger asChild>
                                        <div className="cursor-default rounded-full p-0.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors">
                                            <HelpCircle className="h-4 w-4" />
                                        </div>
                                    </HoverCardTrigger>
                                    <HoverCardContent align="start" className="w-[450px] p-5 rounded-xl shadow-xl border-zinc-200">
                                        <div className="space-y-4">
                                            <div className="space-y-1">
                                                <h4 className="text-sm font-bold text-zinc-900 leading-none">Зачем указывать должность?</h4>
                                                <p className="text-xs text-zinc-500">
                                                    Правильное описание роли агента критически влияет на качество ответов.
                                                </p>
                                            </div>
                                            <div className="grid gap-3">
                                                <div className="flex gap-3 items-start">
                                                    <div className="mt-0.5 rounded-full p-1 bg-blue-50 text-blue-600 shrink-0">
                                                        <User className="h-3 w-3" />
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        <p className="text-xs font-semibold text-zinc-900">Роль и контекст</p>
                                                        <p className="text-[11px] text-zinc-500 leading-relaxed">
                                                            Помогает агенту понять, в каком качестве он выступает (менеджер, помощник, эксперт), что определяет уровень ответственности.
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-3 items-start">
                                                    <div className="mt-0.5 rounded-full p-1 bg-purple-50 text-purple-600 shrink-0">
                                                        <MessageSquare className="h-3 w-3" />
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        <p className="text-xs font-semibold text-zinc-900">Тон общения</p>
                                                        <p className="text-[11px] text-zinc-500 leading-relaxed">
                                                            Влияет на стиль речи. Менеджер говорит иначе, чем консультант. Это создает правильное впечатление о компетентности.
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-3 items-start">
                                                    <div className="mt-0.5 rounded-full p-1 bg-amber-50 text-amber-600 shrink-0">
                                                        <Shield className="h-3 w-3" />
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        <p className="text-xs font-semibold text-zinc-900">Границы компетенции</p>
                                                        <p className="text-[11px] text-zinc-500 leading-relaxed">
                                                            Определяет, в каких вопросах агент может давать рекомендации, а где должен перенаправить к человеку.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </HoverCardContent>
                                </HoverCard>
                            </div>
                            <Textarea
                                id="agent-desc"
                                value={description}
                                onChange={handleDescriptionChange}
                                placeholder="Например: Старший менеджер по работе с корпоративными клиентами. Занимается оформлением сделок и поддержкой ключевых партнеров."
                                className="min-h-[80px] rounded-xl border-transparent bg-zinc-100/50 focus:bg-white focus:ring-2 focus:ring-zinc-200 transition-all font-medium text-zinc-900 resize-none"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Telegram Required Modal */}
                <Dialog open={showTelegramModal} onOpenChange={setShowTelegramModal}>
                    <DialogContent className="sm:max-w-[450px] rounded-2xl p-6 border-zinc-200 shadow-xl">
                        <DialogHeader className="text-center">
                            <div className="mx-auto h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                                <Send className="h-8 w-8 text-blue-600" />
                            </div>
                            <DialogTitle className="text-xl font-bold text-zinc-900">
                                Подключите Telegram
                            </DialogTitle>
                            <DialogDescription className="text-zinc-500 mt-2">
                                Для запуска агента необходимо подключить Telegram бота.
                                Это позволит агенту общаться с пользователями.
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

            </div >
        )
    }
)

GeneralAgentSettingsContent.displayName = 'GeneralAgentSettingsContent'

// Legacy export for backward compatibility
export function GeneralAgentSettings() {
    const { agents } = useUserData()
    const [agentId, setAgentId] = React.useState<string>("")

    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            const pathParts = window.location.pathname.split('/')
            const agentIdIndex = pathParts.indexOf('agents') + 1
            if (agentIdIndex > 0 && pathParts[agentIdIndex]) {
                setAgentId(pathParts[agentIdIndex])
            }
        }
    }, [])

    const agent = agents.find(a => a.id === agentId)

    return <GeneralAgentSettingsContent agentId={agentId} agent={agent as any} />
}
