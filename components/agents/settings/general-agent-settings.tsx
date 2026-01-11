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


import { useParams } from "next/navigation"
import { useUserData } from "@/components/providers/user-data-provider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Power, Play, Square, Send, Save } from "lucide-react"
import { toast } from "sonner"

import { useTranslations } from "next-intl"

export function GeneralAgentSettings() {
    const t = useTranslations('Agents')
    const params = useParams()
    const { agents, refreshAgents } = useUserData()
    const [emoji, setEmoji] = React.useState("🤖")
    const [pickerOpen, setPickerOpen] = React.useState(false)
    const [isLoading, setIsLoading] = React.useState(false)
    const [showTelegramModal, setShowTelegramModal] = React.useState(false)

    // Metadata state
    const [name, setName] = React.useState("")
    const [description, setDescription] = React.useState("")
    const [isSavingMetadata, setIsSavingMetadata] = React.useState(false)

    // Find current agent
    const agentId = params?.agentId as string
    const agent = agents.find(a => a.id === agentId)

    React.useEffect(() => {
        if (agent) {
            setName(agent.name)
            setDescription(agent.description || "")
            // setEmoji(agent.avatarEmoji) // If we had emoji field in backend
        }
    }, [agent])

    const handleEmojiClick = (emojiData: EmojiClickData) => {
        setEmoji(emojiData.emoji)
        setPickerOpen(false)
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
                // Mock
                await new Promise(r => setTimeout(r, 1000))
                toast.success(`Agent ${action}ed (Mock)`)
                await refreshAgents()
                return
            }

            const res = await fetch(`${orchestratorUrl}/api/v1/agents/${agent.id}/${action}`, {
                method: 'POST'
            })

            if (!res.ok) throw new Error(`Failed to ${action} agent`)

            // Response might contain updated status immediately
            const data = await res.json()
            let newStatus = data.status

            // If starting, poll until RUNNING
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

            // Refresh local list to update UI
            await refreshAgents()
            toast.success(`Agent ${action === 'start' ? 'started' : 'stopped'} successfully`)

        } catch (error) {
            console.error(error)
            toast.error(`Failed to ${action} agent`)
        } finally {
            setIsLoading(false)
        }
    }

    const handleSaveMetadata = async () => {
        if (!agent) return

        setIsSavingMetadata(true)
        const orchestratorUrl = process.env.NEXT_PUBLIC_AGENT_ORCHESTRATOR_URL

        try {
            if (!orchestratorUrl) {
                // Mock
                await new Promise(r => setTimeout(r, 800))
                toast.success("Данные успешно сохранены")
                return
            }

            const res = await fetch(`${orchestratorUrl}/api/v1/agents/${agent.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, description, avatarEmoji: emoji })
            })

            if (!res.ok) {
                throw new Error("Failed to update agent")
            }

            toast.success("Данные успешно сохранены")
            await refreshAgents()

        } catch (error) {
            console.error("Failed to save metadata:", error)
            toast.error("Ошибка сохранения")
        } finally {
            setIsSavingMetadata(false)
        }
    }

    if (!agent) {
        return <div>Agent not found</div>
    }

    const isRunning = agent.status === 'RUNNING'

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-zinc-900">Основная информация</h3>
                    <p className="text-sm text-zinc-500 mt-1">
                        Настройте имя агента, его аватар и описание.
                    </p>
                </div>
                <Button onClick={handleSaveMetadata} disabled={isSavingMetadata} className="rounded-xl">
                    {isSavingMetadata ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Сохранение...</>
                    ) : (
                        <><Save className="mr-2 h-4 w-4" /> Сохранить</>
                    )}
                </Button>
            </div>

            {/* Status Control Card */}
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
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Имя агента"
                                className="h-10 rounded-xl border-transparent bg-zinc-100/50 focus:bg-white focus:ring-2 focus:ring-zinc-200 transition-all font-medium text-zinc-900 placeholder:text-zinc-400"
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <Label htmlFor="agent-desc" className="sr-only">Описание</Label>
                        <Textarea
                            id="agent-desc"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Описание агента"
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
        </div>
    )
}

