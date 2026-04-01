"use client"


import { useState, useEffect } from "react"
import { Send, CheckCircle2, Shield, Bot as BotIcon, Key, Loader2, RefreshCw, Power } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { toast } from "sonner"
import { useUserData } from "@/components/providers/user-data-provider"

interface TelegramConnectionDialogProps {
    children?: React.ReactNode
    agentId: string
    initialToken?: string
    onSuccess?: () => void
    embedded?: boolean
}

export function TelegramConnectionDialog({ children, agentId, initialToken, onSuccess, embedded = false }: TelegramConnectionDialogProps) {
    const { agents, refreshAgents } = useUserData()
    const [loading, setLoading] = useState(false)
    const [validating, setValidating] = useState(false)
    const [token, setToken] = useState(initialToken || "")
    const [step, setStep] = useState<"input" | "validated" | "success" | "restart" | "connected" | "start" | "disconnected">("input")
    const [open, setOpen] = useState(false)
    const [botInfo, setBotInfo] = useState<{ id: number; first_name: string; username: string } | null>(null)

    // Find current agent to check status
    const agent = agents.find(a => a.id === agentId)
    const isRunning = agent?.status === 'RUNNING'

    // Reset state when opening
    useEffect(() => {
        if (open) {
            if (initialToken) {
                // Auto-fetch bot info for connected state
                setStep('connected')
                setToken(initialToken)
                fetch(`https://api.telegram.org/bot${initialToken}/getMe`)
                    .then(res => res.json())
                    .then(data => {
                        if (data.ok && data.result) {
                            setBotInfo({
                                id: data.result.id,
                                first_name: data.result.first_name,
                                username: data.result.username || ''
                            })
                        } else {
                            // Token invalid/revoked — fall back to input
                            setStep('input')
                            setBotInfo(null)
                        }
                    })
                    .catch(() => {
                        setStep('input')
                        setBotInfo(null)
                    })
            } else {
                setStep('input')
                setBotInfo(null)
            }
        }
    }, [open, initialToken])

    // Validate token with Telegram API
    const handleValidateToken = async () => {
        if (!token.trim()) {
            toast.error("Введите токен")
            return
        }

        setValidating(true)
        try {
            const response = await fetch(`https://api.telegram.org/bot${token}/getMe`)
            const data = await response.json()

            if (data.ok && data.result) {
                setBotInfo({
                    id: data.result.id,
                    first_name: data.result.first_name,
                    username: data.result.username || ''
                })
                setStep('validated')
            } else {
                toast.error("Неверный токен", { description: data.description || "Проверьте правильность токена" })
            }
        } catch (error) {
            console.error('Validation error:', error)
            toast.error("Ошибка проверки токена")
        } finally {
            setValidating(false)
        }
    }

    const handleConnect = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/orchestrator/agents/${agentId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ telegram_token: token })
            })

            if (!res.ok) throw new Error("Failed to update token")

            await refreshAgents()
            onSuccess?.()

            if (isRunning) {
                setStep('restart')
            } else {
                setStep("start")
            }

        } catch (error) {
            console.error(error)
            toast.error("Не удалось сохранить токен")
            setStep('input') // Go back to input on error
        } finally {
            setLoading(false)
        }
    }

    const handleRestart = async () => {
        setLoading(true)
        try {
            // Stop
            await fetch(`/api/orchestrator/agents/${agentId}/stop`, { method: 'POST' })

            // Start
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

            await refreshAgents()
            toast.success("Агент успешно перезапущен")
            setStep('success')

        } catch (error) {
            console.error(error)
            toast.error("Ошибка при перезапуске агента")
        } finally {
            setLoading(false)
        }
    }

    const handleRestartAfterDisconnect = async () => {
        setLoading(true)
        try {
            await fetch(`/api/orchestrator/agents/${agentId}/stop`, { method: 'POST' })
            await fetch(`/api/orchestrator/agents/${agentId}/start`, { method: 'POST' })

            for (let i = 0; i < 5; i++) {
                await new Promise(r => setTimeout(r, 1000))
                const statusRes = await fetch(`/api/orchestrator/agents/${agentId}/status`)
                if (statusRes.ok) {
                    const statusData = await statusRes.json()
                    const newStatus = statusData.agent?.status || statusData.status
                    if (newStatus === 'RUNNING') break
                }
            }

            await refreshAgents()
            toast.success("Telegram отключён, агент перезапущен")
            setOpen(false)

        } catch (error) {
            console.error(error)
            toast.error("Ошибка при перезапуске агента")
        } finally {
            setLoading(false)
        }
    }

    const handleStart = async () => {
        setLoading(true)
        try {
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

            await refreshAgents()
            toast.success("Агент успешно запущен")
            setStep('success')

        } catch (error) {
            console.error(error)
            toast.error("Ошибка при запуске агента")
        } finally {
            setLoading(false)
        }
    }

    const handleDisconnect = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/orchestrator/agents/${agentId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ telegram_token: "" })
            })

            if (!res.ok) throw new Error("Failed to disconnect")

            await refreshAgents()
            setToken("")
            onSuccess?.()

            if (isRunning) {
                setStep('disconnected')
            } else {
                setOpen(false)
                toast.success("Telegram успешно отключен")
            }

        } catch (error) {
            console.error(error)
            toast.error("Не удалось отключить Telegram")
        } finally {
            setLoading(false)
        }
    }

    // Embedded mode: return just the form without Dialog wrapper
    if (embedded) {
        return (
            <div className="space-y-4">
                {step === "input" && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="token" className="text-sm font-semibold text-foreground">Bot Token</Label>
                            <div className="relative">
                                <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="token"
                                    placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                                    className="pl-9 font-mono text-sm h-11 bg-muted/50 border-border focus:bg-card focus:ring-ring rounded-xl transition-all"
                                    value={token}
                                    onChange={(e) => setToken(e.target.value)}
                                />
                            </div>
                            <p className="text-[11px] text-muted-foreground px-1">
                                Получите токен у <a href="https://t.me/BotFather" target="_blank" className="underline decoration-zinc-300 hover:text-muted-foreground">@BotFather</a> в Telegram.
                            </p>
                        </div>
                        <div className="flex gap-2">
                            {initialToken && (
                                <Button
                                    variant="destructive"
                                    className="w-full rounded-xl shadow-sm"
                                    onClick={handleDisconnect}
                                    disabled={loading}
                                >
                                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Power className="mr-2 h-4 w-4" />}
                                    Отключить
                                </Button>
                            )}
                            <Button
                                className="w-full rounded-xl bg-[#0088cc] hover:bg-[#0077b5] text-white shadow-sm"
                                onClick={handleValidateToken}
                                disabled={!token || validating}
                            >
                                {validating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {validating ? "Проверка..." : "Проверить токен"}
                            </Button>
                        </div>
                    </div>
                )}
                {step === "validated" && botInfo && (
                    <div className="space-y-4">
                        <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-full bg-[#0088cc] flex items-center justify-center">
                                    <BotIcon className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <p className="font-semibold text-foreground">{botInfo.first_name}</p>
                                    <p className="text-sm text-muted-foreground">@{botInfo.username}</p>
                                </div>
                                <CheckCircle2 className="h-5 w-5 text-green-500 ml-auto" />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                className="flex-1 rounded-xl"
                                onClick={() => setStep('input')}
                            >
                                Назад
                            </Button>
                            <Button
                                className="flex-1 rounded-xl bg-green-600 hover:bg-green-700 text-white"
                                onClick={handleConnect}
                                disabled={loading}
                            >
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {loading ? "Сохранение..." : "Сохранить"}
                            </Button>
                        </div>
                    </div>
                )}
                {step === "success" && (
                    <div className="text-center py-4">
                        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                        <p className="font-semibold text-foreground">Telegram подключён!</p>
                        <p className="text-sm text-muted-foreground">Теперь вы можете запустить агента.</p>
                    </div>
                )}
            </div>
        )
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden gap-0 rounded-2xl bg-card border-border shadow-2xl">
                <div className="grid md:grid-cols-5 h-full">
                    {/* Left Side: Bot Preview / Info */}
                    <div className="md:col-span-2 bg-muted/50 border-r border-border p-6 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-lg bg-[#0088cc] flex items-center justify-center shadow-sm shadow-blue-200">
                                    <Send className="h-4 w-4 text-white" />
                                </div>
                                <span className="font-bold text-foreground tracking-tight">Telegram Bot</span>
                            </div>

                        </div>


                    </div>

                    {/* Right Side: Form */}
                    <div className="md:col-span-3 p-6 flex flex-col">
                        <DialogHeader className="mb-6">
                            <DialogTitle className="text-xl font-bold text-foreground">
                                {step === 'restart' || step === 'disconnected' ? 'Требуется перезапуск' : step === 'start' ? 'Требуется запуск' : step === 'connected' ? 'Управление подключением' : 'Настройка подключения'}
                            </DialogTitle>
                            <DialogDescription className="text-muted-foreground">
                                {step === 'restart'
                                    ? 'Агент активен. Для применения нового токена необходим перезапуск.'
                                    : step === 'disconnected'
                                        ? 'Агент активен. Для применения изменений необходим перезапуск.'
                                        : step === 'start'
                                            ? 'Запустите агента, чтобы изменения вступили в силу.'
                                            : step === 'connected'
                                                ? 'Telegram-бот подключён к агенту.'
                                                : 'Введите токен вашего бота для активации.'}
                            </DialogDescription>
                        </DialogHeader>

                        {step === "input" && (
                            <div className="space-y-6 flex-1">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="token" className="text-sm font-semibold text-foreground">Bot Token</Label>
                                        <div className="relative">
                                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="token"
                                                placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                                                className="pl-9 font-mono text-sm h-11 bg-muted/50 border-border focus:bg-card focus:ring-ring rounded-xl transition-all"
                                                value={token}
                                                onChange={(e) => setToken(e.target.value)}
                                            />
                                        </div>
                                        <p className="text-[11px] text-muted-foreground px-1">
                                            Этот токен можно получить у <a href="https://t.me/BotFather" target="_blank" className="underline decoration-zinc-300 hover:text-muted-foreground">@BotFather</a> в Telegram.
                                        </p>
                                    </div>

                                    <Card className="p-3 bg-blue-50/50 border-blue-100 rounded-xl space-y-2">
                                        <h4 className="text-xs font-semibold text-blue-900">Как получить токен?</h4>
                                        <ol className="list-decimal list-inside text-[11px] text-blue-700 space-y-1">
                                            <li>Откройте @BotFather в Telegram</li>
                                            <li>Отправьте команду /newbot</li>
                                            <li>Скопируйте полученный API Token</li>
                                        </ol>
                                    </Card>
                                </div>

                                <div className="mt-auto pt-4 flex justify-end gap-2">
                                    {initialToken && (
                                        <Button
                                            variant="destructive"
                                            className="rounded-xl px-3"
                                            onClick={handleDisconnect}
                                            disabled={loading}
                                            title="Отключить интеграцию"
                                        >
                                            <Power className="h-4 w-4" />
                                        </Button>
                                    )}
                                    <Button variant="ghost" className="rounded-xl hover:bg-muted text-muted-foreground" onClick={() => setOpen(false)}>Отмена</Button>
                                    <Button
                                        className="rounded-xl bg-[#0088cc] hover:bg-[#0077b5] text-white shadow-sm shadow-blue-200"
                                        onClick={handleValidateToken}
                                        disabled={!token || validating}
                                    >
                                        {validating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {validating ? "Проверка..." : "Проверить токен"}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {step === "validated" && botInfo && (
                            <div className="flex flex-col items-center justify-center flex-1 py-6 space-y-6 animate-in fade-in zoom-in-95 duration-300 w-full max-w-sm mx-auto">
                                <div className="p-6 bg-green-50/50 border border-green-100 rounded-3xl w-full shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="h-16 w-16 rounded-2xl bg-card flex items-center justify-center shadow-sm border border-border shrink-0">
                                            <div className="h-10 w-10 rounded-xl bg-[#0088cc] flex items-center justify-center">
                                                <BotIcon className="h-6 w-6 text-white" />
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-lg font-bold text-foreground truncate">{botInfo.first_name}</p>
                                            <p className="text-sm text-muted-foreground truncate">@{botInfo.username}</p>
                                        </div>
                                        <div className="bg-green-100 p-1.5 rounded-full shrink-0">
                                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                                        </div>
                                    </div>
                                </div>

                                <div className="text-center space-y-1">
                                    <p className="font-medium text-foreground">Бот найден!</p>
                                    <p className="text-sm text-muted-foreground">Сохранить подключение и активировать агента?</p>
                                </div>

                                <div className="flex w-full gap-3 pt-2">
                                    <Button variant="outline" className="flex-1 h-11 rounded-xl border-border hover:bg-muted/50 hover:text-foreground" onClick={() => setStep('input')}>
                                        Назад
                                    </Button>
                                    <Button
                                        className="flex-1 h-11 rounded-xl bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-200"
                                        onClick={handleConnect}
                                        disabled={loading}
                                    >
                                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {loading ? "Сохранение..." : "Подключить"}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {step === "connected" && (
                            <div className="flex flex-col items-center justify-center flex-1 py-6 space-y-6 animate-in fade-in zoom-in-95 duration-300 w-full max-w-sm mx-auto">
                                <div className="p-6 bg-green-50/50 border border-green-100 rounded-3xl w-full shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="h-16 w-16 rounded-2xl bg-card flex items-center justify-center shadow-sm border border-border shrink-0">
                                            <div className="h-10 w-10 rounded-xl bg-[#0088cc] flex items-center justify-center">
                                                <BotIcon className="h-6 w-6 text-white" />
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            {botInfo ? (
                                                <>
                                                    <p className="text-lg font-bold text-foreground truncate">{botInfo.first_name}</p>
                                                    <a
                                                        href={`https://t.me/${botInfo.username}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-sm text-[#0088cc] hover:underline truncate block"
                                                    >
                                                        @{botInfo.username}
                                                    </a>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="h-4 w-24 bg-muted rounded animate-pulse mb-1.5" />
                                                    <div className="h-3 w-16 bg-muted/50 rounded animate-pulse" />
                                                </>
                                            )}
                                        </div>
                                        <Badge className="bg-green-100 text-green-700 border-green-200 shrink-0">Подключено</Badge>
                                    </div>
                                </div>

                                <div className="flex w-full gap-3 pt-2">
                                    <Button
                                        variant="outline"
                                        className="flex-1 h-11 rounded-xl border-border hover:bg-muted/50 hover:text-foreground"
                                        onClick={() => {
                                            setStep('input')
                                            setToken('')
                                            setBotInfo(null)
                                        }}
                                    >
                                        Изменить токен
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        className="flex-1 h-11 rounded-xl"
                                        onClick={handleDisconnect}
                                        disabled={loading}
                                    >
                                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {loading ? "Отключение..." : "Отключить"}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {step === "disconnected" && (
                            <div className="flex flex-col items-center justify-center flex-1 py-4 text-center space-y-4 animate-in fade-in zoom-in-95 duration-300">
                                <div className="h-16 w-16 rounded-full bg-yellow-100 flex items-center justify-center mb-2">
                                    <RefreshCw className="h-8 w-8 text-yellow-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-foreground">Telegram отключён</h3>
                                    <p className="text-sm text-muted-foreground max-w-[250px] mx-auto mt-1">
                                        Чтобы изменения вступили в силу, агент должен быть перезапущен.
                                    </p>
                                </div>

                                <div className="flex w-full gap-2 mt-4">
                                    <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setOpen(false)}>
                                        Позже
                                    </Button>
                                    <Button
                                        className="flex-1 rounded-xl bg-yellow-500 hover:bg-yellow-600 text-white"
                                        onClick={handleRestartAfterDisconnect}
                                        disabled={loading}
                                    >
                                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {loading ? "Перезапуск..." : "Перезапустить сейчас"}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {step === "start" && (
                            <div className="flex flex-col items-center justify-center flex-1 py-4 text-center space-y-4 animate-in fade-in zoom-in-95 duration-300">
                                <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center mb-2">
                                    <Power className="h-8 w-8 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-foreground">Токен сохранён</h3>
                                    <p className="text-sm text-muted-foreground max-w-[250px] mx-auto mt-1">
                                        Запустите агента, чтобы подключение к Telegram вступило в силу.
                                    </p>
                                </div>

                                <div className="flex w-full gap-2 mt-4">
                                    <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setOpen(false)}>
                                        Позже
                                    </Button>
                                    <Button
                                        className="flex-1 rounded-xl bg-[#0088cc] hover:bg-[#0077b5] text-white"
                                        onClick={handleStart}
                                        disabled={loading}
                                    >
                                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {loading ? "Запуск..." : "Запустить сейчас"}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {step === "restart" && (
                            <div className="flex flex-col items-center justify-center flex-1 py-4 text-center space-y-4 animate-in fade-in zoom-in-95 duration-300">
                                <div className="h-16 w-16 rounded-full bg-yellow-100 flex items-center justify-center mb-2">
                                    <RefreshCw className="h-8 w-8 text-yellow-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-foreground">Токен обновлен</h3>
                                    <p className="text-sm text-muted-foreground max-w-[250px] mx-auto mt-1">
                                        Чтобы изменения вступили в силу, агент должен быть перезапущен.
                                    </p>
                                </div>

                                <div className="flex w-full gap-2 mt-4">
                                    <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setOpen(false)}>
                                        Позже
                                    </Button>
                                    <Button
                                        className="flex-1 rounded-xl bg-yellow-500 hover:bg-yellow-600 text-white"
                                        onClick={handleRestart}
                                        disabled={loading}
                                    >
                                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {loading ? "Перезапуск..." : "Перезапустить сейчас"}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {step === "success" && (
                            <div className="flex flex-col items-center justify-center flex-1 py-4 text-center space-y-4 animate-in fade-in zoom-in-95 duration-300">
                                <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-2">
                                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-foreground">Успешно подключено!</h3>
                                    <p className="text-sm text-muted-foreground max-w-[250px] mx-auto mt-1">
                                        Ваш агент теперь отвечает в Telegram.
                                    </p>
                                </div>
                                <div className="w-full bg-muted/50 p-4 rounded-xl border border-border flex items-center justify-between mt-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-muted" />
                                        <div className="text-left">
                                            <div className="text-sm font-semibold text-foreground">Telegram Bot</div>
                                            <div className="text-[10px] text-muted-foreground">{token.substring(0, 12)}...</div>
                                        </div>
                                    </div>
                                    <Badge variant="secondary" className="bg-green-100 text-green-700 h-6 px-2 text-[10px] font-bold tracking-wide rounded-lg">ACTIVE</Badge>
                                </div>

                                <Button className="w-full rounded-xl mt-4" onClick={() => setOpen(false)}>
                                    Закрыть
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
