"use client"

import * as React from "react"
import { Send, RotateCcw, MessageSquare, ThumbsUp, ThumbsDown, Bot, User, Loader2, AlertTriangle, Trash2, History } from "lucide-react"
import { useTranslations } from "next-intl"
import { useParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { EmojiAvatar } from "@/components/shared/emoji-avatar"
import { MarkdownText } from "@/components/shared/markdown-text"
import { useUserPreferences } from "@/components/providers/user-preferences-provider"
import { toast } from "sonner"
import { saveChatTestHistory, getChatTestHistory, getChatTestHistoryById } from "@/actions/chat-test-history"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

interface Message {
    id: number
    role: 'user' | 'assistant'
    text: string
    feedback: 'like' | 'dislike' | null
}

interface ManualTestInterfaceProps {
    onFeedbackSubmit: (text: string) => void
}

export function ManualTestInterface({ onFeedbackSubmit }: ManualTestInterfaceProps) {
    const t = useTranslations('Testing')
    const params = useParams()
    const agentId = params.agentId as string
    const { avatar: userEmoji } = useUserPreferences()

    const [messages, setMessages] = React.useState<Message[]>([])
    const [sessionId, setSessionId] = React.useState<string | null>(null)
    const [input, setInput] = React.useState("")
    const [isLoading, setIsLoading] = React.useState(false)
    const [isResetting, setIsResetting] = React.useState(false)

    const scrollRef = React.useRef<HTMLDivElement>(null)

    const [isFeedbackOpen, setIsFeedbackOpen] = React.useState(false)
    const [feedbackType, setFeedbackType] = React.useState<'like' | 'dislike'>('dislike')
    const [feedbackText, setFeedbackText] = React.useState("")
    const [activeMessageId, setActiveMessageId] = React.useState<number | null>(null)
    const [welcomeMessage, setWelcomeMessage] = React.useState<string | null>(null)
    const [hasShownWelcome, setHasShownWelcome] = React.useState(false)
    const [isHistoryOpen, setIsHistoryOpen] = React.useState(false)
    const [historyItems, setHistoryItems] = React.useState<{ id: string, sessionId: string | null, messageCount: number, createdAt: Date }[]>([])

    const gatewayUrl = process.env.NEXT_PUBLIC_AI_GATEWAY_URL || ''
    const orchestratorUrl = process.env.NEXT_PUBLIC_AGENT_ORCHESTRATOR_URL || ''
    const STORAGE_KEY = `test_session_${agentId}`

    // Load from localStorage on mount
    React.useEffect(() => {
        if (typeof window === 'undefined' || !agentId) return

        try {
            const saved = localStorage.getItem(STORAGE_KEY)
            if (saved) {
                const data = JSON.parse(saved)
                if (data.messages && Array.isArray(data.messages)) {
                    setMessages(data.messages)
                    setHasShownWelcome(true) // Don't show welcome if we have saved messages
                }
                if (data.sessionId) {
                    setSessionId(data.sessionId)
                }
            }
        } catch (error) {
            console.error('Failed to load from localStorage:', error)
        }
    }, [agentId, STORAGE_KEY])

    // Save to localStorage when messages or sessionId change
    React.useEffect(() => {
        if (typeof window === 'undefined' || !agentId) return
        if (messages.length === 0 && !sessionId) return // Don't save empty state

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                messages,
                sessionId,
                savedAt: new Date().toISOString()
            }))
        } catch (error) {
            console.error('Failed to save to localStorage:', error)
        }
    }, [messages, sessionId, agentId, STORAGE_KEY])

    // Scroll to bottom when new messages arrive
    React.useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    // Fetch welcome message on mount
    React.useEffect(() => {
        const fetchWelcomeMessage = async () => {
            if (!orchestratorUrl || !agentId) return

            try {
                const res = await fetch(`${orchestratorUrl}/api/v1/agents/${agentId}/behavior`)
                if (res.ok) {
                    const data = await res.json()
                    if (data.welcomeMessage) {
                        setWelcomeMessage(data.welcomeMessage)
                    }
                }
            } catch (error) {
                console.error('Failed to fetch welcome message:', error)
            }
        }

        fetchWelcomeMessage()
    }, [agentId, orchestratorUrl])

    // Show welcome message when session starts
    React.useEffect(() => {
        if (welcomeMessage && !hasShownWelcome && messages.length === 0) {
            setHasShownWelcome(true)
            const welcomeMsg: Message = {
                id: Date.now(),
                role: 'assistant',
                text: welcomeMessage,
                feedback: null
            }
            setMessages([welcomeMsg])
        }
    }, [welcomeMessage, hasShownWelcome, messages.length])

    // Load chat history on mount if we have a session
    React.useEffect(() => {
        const loadHistory = async () => {
            if (!sessionId || !gatewayUrl) return

            try {
                const response = await fetch(
                    `${gatewayUrl}/api/v1/agents/${agentId}/chat/history?session_id=${sessionId}`
                )
                if (response.ok) {
                    const data = await response.json()
                    if (data.messages && Array.isArray(data.messages)) {
                        const formattedMessages: Message[] = data.messages.map((msg: any, idx: number) => ({
                            id: idx,
                            role: msg.role === 'user' ? 'user' : 'assistant',
                            text: msg.content || msg.message,
                            feedback: null
                        }))
                        setMessages(formattedMessages)
                    }
                }
            } catch (error) {
                console.error('Failed to load chat history:', error)
            }
        }

        loadHistory()
    }, [sessionId, agentId, gatewayUrl])

    const handleSend = async () => {
        if (!input.trim() || isLoading) return

        const userMessage: Message = {
            id: Date.now(),
            role: 'user',
            text: input.trim(),
            feedback: null
        }

        setMessages(prev => [...prev, userMessage])
        setInput("")
        setIsLoading(true)

        try {
            const requestBody: { message: string; is_test: boolean; session_id?: string } = {
                message: userMessage.text,
                is_test: true
            }
            if (sessionId) {
                requestBody.session_id = sessionId
            }

            const response = await fetch(`${gatewayUrl}/api/v1/agents/${agentId}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            })

            if (!response.ok) {
                throw new Error('Failed to send message')
            }

            const data = await response.json()

            // Update session ID if new (API returns sessionId in camelCase)
            if (data.sessionId && data.sessionId !== sessionId) {
                setSessionId(data.sessionId)
            }

            const assistantMessage: Message = {
                id: Date.now() + 1,
                role: 'assistant',
                text: data.response || data.message || 'No response',
                feedback: null
            }

            setMessages(prev => [...prev, assistantMessage])
        } catch (error) {
            console.error('Chat error:', error)
            toast.error('Ошибка отправки', { description: 'Не удалось отправить сообщение' })
            // Remove the user message on error
            setMessages(prev => prev.filter(m => m.id !== userMessage.id))
        } finally {
            setIsLoading(false)
        }
    }

    // Load history from DB
    const loadHistory = async () => {
        const history = await getChatTestHistory(agentId)
        setHistoryItems(history)
    }

    // Load history on mount
    React.useEffect(() => {
        loadHistory()
    }, [agentId])

    const handleResetSession = async () => {
        setIsResetting(true)

        // Save current session to DB before clearing (if we have messages)
        if (messages.length > 0) {
            try {
                const result = await saveChatTestHistory(agentId, messages, sessionId)
                if (result.success) {
                    await loadHistory() // Refresh history list
                } else {
                    console.error('Failed to save history:', result.error)
                    toast.error("Не удалось сохранить историю", { description: result.error })
                }
            } catch (e) {
                console.error('Failed to save to DB:', e)
                toast.error("Ошибка сохранения истории")
            }
        }

        // Clear localStorage
        try {
            localStorage.removeItem(STORAGE_KEY)
        } catch (e) {
            console.error('Failed to clear localStorage:', e)
        }

        try {
            const body = sessionId ? { session_id: sessionId } : {}
            const response = await fetch(`${gatewayUrl}/api/v1/agents/${agentId}/chat/reset`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })

            if (response.ok) {
                const data = await response.json()
                setSessionId(data.sessionId || null)
                setMessages([])
                setHasShownWelcome(false) // Reset welcome message flag
                toast.success('Сессия сброшена', { description: 'Диалог сохранён в историю' })
            }
        } catch (error) {
            console.error('Reset error:', error)
            // Even on error, clear local state
            setSessionId(null)
            setMessages([])
            setHasShownWelcome(false)
        } finally {
            setIsResetting(false)
        }
    }

    const openFeedbackDialog = (msgId: number, type: 'like' | 'dislike') => {
        setActiveMessageId(msgId)
        setFeedbackType(type)
        setFeedbackText("")
        setIsFeedbackOpen(true)
    }

    const submitFeedback = () => {
        if (feedbackType === 'dislike' && feedbackText.trim()) {
            onFeedbackSubmit(feedbackText)
        } else if (feedbackType === 'like') {
            if (feedbackText.trim()) {
                toast.success("Положительный отзыв сохранён", { description: "Спасибо за обратную связь!" })
            }
        }

        setMessages(prev => prev.map(msg =>
            msg.id === activeMessageId ? { ...msg, feedback: feedbackType } : msg
        ))

        setIsFeedbackOpen(false)
    }

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-100 shrink-0">
                <div className="flex items-center gap-2 text-sm font-medium text-zinc-900">
                    <MessageSquare className="h-4 w-4 text-zinc-400" />
                    {t('manualSession')}
                    {sessionId && (
                        <span className="text-xs text-zinc-400 font-mono">
                            ({sessionId.slice(0, 12)}...)
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Sheet open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
                        <SheetTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
                            >
                                <History className="mr-2 h-3 w-3" />
                                История
                            </Button>
                        </SheetTrigger>
                        <SheetContent className="w-[400px] sm:w-[540px] flex flex-col p-6 overflow-hidden">
                            <SheetHeader className="mb-4">
                                <SheetTitle className="text-xl font-semibold">История тестирования</SheetTitle>
                            </SheetHeader>
                            <ScrollArea className="flex-1 pr-4 -mr-4">
                                <div className="space-y-3 pb-8">
                                    {historyItems.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-500">
                                            <History className="h-10 w-10 mb-3 opacity-20" />
                                            <p className="text-sm">История пуста</p>
                                        </div>
                                    ) : (
                                        historyItems.map((item) => (
                                            <div
                                                key={item.id}
                                                className="group relative flex flex-col gap-2 rounded-xl border border-zinc-100 bg-zinc-50/50 p-4 hover:bg-zinc-50 hover:border-zinc-200 transition-all cursor-pointer"
                                                onClick={async () => {
                                                    const history = await getChatTestHistoryById(item.id)
                                                    if (history) {
                                                        setMessages(history.messages)
                                                        setSessionId(history.sessionId)
                                                        setHasShownWelcome(true)
                                                        setIsHistoryOpen(false)
                                                        toast.success("История загружена")

                                                        // Update localStorage to match loaded history
                                                        try {
                                                            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                                                                messages: history.messages,
                                                                sessionId: history.sessionId,
                                                                savedAt: new Date().toISOString()
                                                            }))
                                                        } catch (e) {
                                                            console.error('Failed to update localStorage:', e)
                                                        }
                                                    } else {
                                                        toast.error("Не удалось загрузить историю")
                                                    }
                                                }}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-semibold text-zinc-900 bg-white px-2 py-0.5 rounded-md border border-zinc-100 shadow-sm">
                                                        {new Date(item.createdAt).toLocaleDateString()}
                                                    </span>
                                                    <span className="text-[10px] text-zinc-400 font-mono">
                                                        {new Date(item.createdAt).toLocaleTimeString()}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1">
                                                    <MessageSquare className="h-3 w-3" />
                                                    {item.messageCount} сообщений
                                                    {item.sessionId && (
                                                        <span className="text-[10px] text-zinc-300 ml-auto font-mono">
                                                            #{item.sessionId.slice(0, 8)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </ScrollArea>
                        </SheetContent>
                    </Sheet>

                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
                        onClick={handleResetSession}
                        disabled={isResetting}
                    >
                        {isResetting ? (
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        ) : (
                            <RotateCcw className="mr-2 h-3 w-3" />
                        )}
                        {t('newSession')}
                    </Button>
                </div>
            </div>

            {/* Chat Area */}
            <ScrollArea className="flex-1 p-4 bg-white min-h-0" ref={scrollRef}>
                <div className="flex flex-col gap-4">
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-32 text-center">
                            <Bot className="h-10 w-10 text-zinc-200 mb-2" />
                            <p className="text-zinc-400 text-sm">Напишите сообщение, чтобы начать тестирование</p>
                        </div>
                    )}

                    {messages.map((msg) => (
                        <div key={msg.id} className={`group flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            {msg.role === 'assistant' ? (
                                <div className="mt-1">
                                    <EmojiAvatar
                                        value="🤖"
                                        fallbackIcon={Bot}
                                        className="mt-1"
                                    />
                                </div>
                            ) : (
                                <div className="mt-1">
                                    <EmojiAvatar
                                        value={userEmoji || "😎"}
                                        fallbackIcon={User}
                                        className="mt-1"
                                    />
                                </div>
                            )}

                            <div className="flex flex-col gap-1 max-w-[80%]">
                                <div className={cn(
                                    "px-4 py-3 text-[14px] leading-relaxed shadow-sm",
                                    msg.role === 'user'
                                        ? "bg-zinc-900 text-white rounded-[20px] rounded-tr-sm"
                                        : "bg-white border border-zinc-100 text-zinc-800 rounded-[20px] rounded-tl-sm"
                                )}>
                                    <MarkdownText>{msg.text}</MarkdownText>
                                </div>

                                {/* Feedback Actions (Only for Assistant) */}
                                {msg.role === 'assistant' && (
                                    <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 px-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className={cn("h-7 w-7 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-green-600 transition-colors", msg.feedback === 'like' && "text-green-600 bg-green-50")}
                                            onClick={() => openFeedbackDialog(msg.id, 'like')}
                                        >
                                            <ThumbsUp className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className={cn("h-7 w-7 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-red-600 transition-colors", msg.feedback === 'dislike' && "text-red-600 bg-red-50")}
                                            onClick={() => openFeedbackDialog(msg.id, 'dislike')}
                                        >
                                            <ThumbsDown className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex gap-4">
                            <EmojiAvatar
                                value="🤖"
                                className="mt-1"
                            />
                            <div className="bg-white border border-zinc-100 rounded-[20px] rounded-tl-sm p-4 shadow-sm w-20 flex items-center justify-center">
                                <span className="flex gap-1.5">
                                    <span className="animate-bounce delay-0 h-1.5 w-1.5 bg-zinc-300 rounded-full"></span>
                                    <span className="animate-bounce delay-150 h-1.5 w-1.5 bg-zinc-300 rounded-full"></span>
                                    <span className="animate-bounce delay-300 h-1.5 w-1.5 bg-zinc-300 rounded-full"></span>
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* Context Overflow Warning */}
            {messages.length >= 10 && (
                <div className="px-3 py-2 bg-amber-50 border-t border-amber-100 flex items-center justify-between gap-2 shrink-0">
                    <div className="flex items-center gap-2 text-amber-700 text-xs">
                        <AlertTriangle className="h-4 w-4" />
                        <span>Контекст переполнен. Рекомендуем очистить чат 🧹</span>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs text-amber-700 hover:text-amber-900 hover:bg-amber-100 px-2"
                        onClick={handleResetSession}
                        disabled={isResetting}
                    >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Очистить
                    </Button>
                </div>
            )}

            {/* Input Area */}
            <div className="p-3 bg-white border-t border-zinc-100 shrink-0">
                <div className="relative group">
                    <Textarea
                        placeholder={t('typeScenario')}
                        className="min-h-[56px] py-4 pl-4 pr-14 resize-none rounded-2xl bg-zinc-50 border-transparent focus:border-transparent ring-0 focus:ring-1 focus:ring-zinc-200 text-zinc-800 placeholder:text-zinc-400 transition-all font-medium text-sm shadow-inner"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                handleSend()
                            }
                        }}
                        disabled={isLoading}
                    />
                    <Button
                        size="icon"
                        variant="ghost"
                        className="absolute bottom-2.5 right-2.5 h-9 w-9 rounded-xl hover:bg-white hover:shadow-sm text-zinc-400 hover:text-zinc-900 transition-all"
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                    >
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                    </Button>
                </div>
            </div>

            {/* Feedback Dialog */}
            <Dialog open={isFeedbackOpen} onOpenChange={setIsFeedbackOpen}>
                <DialogContent className="sm:max-w-[425px] rounded-2xl p-6 border-zinc-100 shadow-xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold text-zinc-900">
                            {feedbackType === 'like' ? 'Что понравилось?' : 'Что пошло не так?'}
                        </DialogTitle>
                        <DialogDescription className="text-zinc-500">
                            {feedbackType === 'like'
                                ? 'Расскажите, что агент сделал хорошо, чтобы мы могли закрепить это поведение.'
                                : 'Опишите проблему (неверные факты, тон, галлюцинации), чтобы добавить её в очередь улучшений.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-2">
                        <div className="grid gap-2">
                            <Label htmlFor="feedback-text" className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                                {feedbackType === 'like' ? 'Отзыв (опционально)' : 'Описание проблемы'}
                            </Label>
                            <Textarea
                                id="feedback-text"
                                placeholder={feedbackType === 'like' ? "Отличный тон, точный ответ..." : "Неверная цена, грубый тон..."}
                                className="h-32 resize-none rounded-xl bg-zinc-50 border-zinc-200 focus:border-zinc-300 focus:ring-0"
                                value={feedbackText}
                                onChange={(e) => setFeedbackText(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsFeedbackOpen(false)} className="rounded-xl border-zinc-200 h-10 font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900">Отмена</Button>
                        <Button onClick={submitFeedback} className="rounded-xl h-10 bg-zinc-900 text-white hover:bg-zinc-800 shadow-sm font-medium">
                            {feedbackType === 'like' ? 'Отправить' : 'Сообщить о проблеме'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
