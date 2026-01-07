"use client"

import * as React from "react"
import { Send, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface Message {
    id: string
    role: "user" | "assistant" | "system"
    content: string
    timestamp: Date
}

interface ManualTestInterfaceProps {
    agentId: string
    agentName?: string
    agentAvatar?: string
    welcomeMessage?: string
}

const suggestionChips = [
    "Как оформить возврат?",
    "Сколько стоит доставка?",
    "Какие есть способы оплаты?",
    "Время работы поддержки?",
]

export function ManualTestInterface({
    agentId,
    agentName = "Test Agent",
    agentAvatar,
    welcomeMessage,
}: ManualTestInterfaceProps) {
    const [messages, setMessages] = React.useState<Message[]>([])
    const [input, setInput] = React.useState("")
    const [isLoading, setIsLoading] = React.useState(false)
    const scrollRef = React.useRef<HTMLDivElement>(null)
    const [sessionStarted, setSessionStarted] = React.useState(false)

    // Show welcome message on session start
    React.useEffect(() => {
        if (!sessionStarted && welcomeMessage) {
            setSessionStarted(true)
            const welcomeMsg: Message = {
                id: "welcome",
                role: "assistant",
                content: welcomeMessage,
                timestamp: new Date(),
            }
            setMessages([welcomeMsg])
        }
    }, [welcomeMessage, sessionStarted])

    const handleSend = async (message: string = input) => {
        if (!message.trim() || isLoading) return

        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: message,
            timestamp: new Date(),
        }

        setMessages((prev) => [...prev, userMessage])
        setInput("")
        setIsLoading(true)

        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000))

        const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: `Это тестовый ответ на: "${message}". В production здесь будет реальный ответ от агента.`,
            timestamp: new Date(),
        }

        setMessages((prev) => [...prev, assistantMessage])
        setIsLoading(false)
    }

    const handleReset = () => {
        setMessages([])
        setInput("")
        setSessionStarted(false)
        // Re-trigger welcome message after reset
        if (welcomeMessage) {
            setTimeout(() => {
                setSessionStarted(true)
                const welcomeMsg: Message = {
                    id: "welcome-" + Date.now(),
                    role: "assistant",
                    content: welcomeMessage,
                    timestamp: new Date(),
                }
                setMessages([welcomeMsg])
            }, 100)
        }
    }

    React.useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    return (
        <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b p-4">
                <div className="flex items-center gap-3">
                    <Avatar>
                        <AvatarImage src={agentAvatar} />
                        <AvatarFallback>{agentName.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                        <h3 className="font-semibold">{agentName}</h3>
                        <p className="text-xs text-muted-foreground">Test Mode • Sandbox</p>
                    </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleReset}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset Chat
                </Button>
            </div>

            {/* Suggestion Chips */}
            {messages.length === 0 && (
                <div className="border-b p-4">
                    <p className="mb-3 text-sm text-muted-foreground">
                        Попробуйте эти вопросы:
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {suggestionChips.map((chip) => (
                            <Badge
                                key={chip}
                                variant="outline"
                                className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                                onClick={() => handleSend(chip)}
                            >
                                {chip}
                            </Badge>
                        ))}
                    </div>
                </div>
            )}

            {/* Messages */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                <div className="space-y-4">
                    {messages.length === 0 && (
                        <div className="flex h-full items-center justify-center text-center text-muted-foreground">
                            <div>
                                <p className="text-lg font-medium">Начните тестирование</p>
                                <p className="text-sm">
                                    Отправьте сообщение или выберите готовый вопрос
                                </p>
                            </div>
                        </div>
                    )}

                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={cn(
                                "flex gap-3",
                                message.role === "user" && "flex-row-reverse"
                            )}
                        >
                            {message.role === "assistant" && (
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={agentAvatar} />
                                    <AvatarFallback>{agentName.slice(0, 2)}</AvatarFallback>
                                </Avatar>
                            )}
                            <div
                                className={cn(
                                    "max-w-[80%] rounded-lg px-4 py-2",
                                    message.role === "user"
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted"
                                )}
                            >
                                <p className="text-sm">{message.content}</p>
                                <p className="mt-1 text-xs opacity-70">
                                    {message.timestamp.toLocaleTimeString()}
                                </p>
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex gap-3">
                            <Avatar className="h-8 w-8">
                                <AvatarFallback>{agentName.slice(0, 2)}</AvatarFallback>
                            </Avatar>
                            <div className="rounded-lg bg-muted px-4 py-2">
                                <div className="flex gap-1">
                                    <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                                    <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                                    <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* Input */}
            <div className="border-t p-4">
                <form
                    onSubmit={(e) => {
                        e.preventDefault()
                        handleSend()
                    }}
                    className="flex gap-2"
                >
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Напишите сообщение..."
                        disabled={isLoading}
                    />
                    <Button type="submit" disabled={!input.trim() || isLoading}>
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
            </div>
        </div>
    )
}
