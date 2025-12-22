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


import { useParams } from "next/navigation"
import { useUserData } from "@/components/providers/user-data-provider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Power, Play, Square } from "lucide-react"
import { toast } from "sonner"

import { useTranslations } from "next-intl"

export function GeneralAgentSettings() {
    const t = useTranslations('Agents')
    const params = useParams()
    const { agents, refreshAgents } = useUserData()
    const [emoji, setEmoji] = React.useState("🤖")
    const [pickerOpen, setPickerOpen] = React.useState(false)
    const [isLoading, setIsLoading] = React.useState(false)

    // Find current agent
    const agentId = params?.agentId as string
    const agent = agents.find(a => a.id === agentId)

    const handleEmojiClick = (emojiData: EmojiClickData) => {
        setEmoji(emojiData.emoji)
        setPickerOpen(false)
    }

    const handleToggleStatus = async () => {
        if (!agent) return

        const isRunning = agent.status === 'RUNNING'
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

    if (!agent) {
        return <div>Agent not found</div>
    }

    const isRunning = agent.status === 'RUNNING'

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-bold text-zinc-900">Основная информация</h3>
                <p className="text-sm text-zinc-500 mt-1">
                    Настройте имя агента, его аватар и описание.
                </p>
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
                                defaultValue={agent.name}
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
                            defaultValue={agent.description}
                            placeholder="Описание агента"
                            className="min-h-[80px] rounded-xl border-transparent bg-zinc-100/50 focus:bg-white focus:ring-2 focus:ring-zinc-200 transition-all font-medium text-zinc-900 resize-none"
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

