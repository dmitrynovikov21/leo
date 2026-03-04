"use client"

import * as React from "react"
import { Send, MoreVertical, Phone, Video, Search, Lock, Unlock, Bot } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface ChatThreadViewProps {
    chat: {
        id: string
        name: string
        avatar: string
        channel: string
        sentiment: string
        lastMessage: string
    }
}

export function ChatThreadView({ chat }: ChatThreadViewProps) {
    const [isTakeover, setIsTakeover] = React.useState(false)
    const [messages, setMessages] = React.useState([
        { id: 1, role: "user", text: "Hi, I have a question about the enterprise plan." },
        { id: 2, role: "agent", text: "Hello! I'd be happy to help. What specifically would you like to know?" },
        { id: 3, role: "user", text: chat.lastMessage },
    ])
    const [input, setInput] = React.useState("")

    const handleSend = () => {
        if (!input.trim()) return
        setMessages([...messages, { id: Date.now(), role: "operator", text: input }])
        setInput("")
    }

    return (
        <div className="flex flex-col h-full bg-card">
            {/* HEADER */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border h-[72px]">
                <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10 border border-border">
                        <AvatarImage src={chat.avatar} />
                        <AvatarFallback className="bg-muted text-muted-foreground font-bold">{chat.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-foreground flex items-center gap-2">
                            {chat.name}
                            {chat.sentiment === "negative" && (
                                <Badge variant="destructive" className="h-5 px-1.5 text-[10px] bg-red-50 text-red-600 border border-red-100 hover:bg-red-50 shadow-none">Risk</Badge>
                            )}
                        </span>
                        <span className="text-xs text-muted-foreground font-medium capitalize">{chat.channel} user</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-xl border border-border mr-2">
                        <Label htmlFor="takeover-mode" className="text-xs font-semibold cursor-pointer flex items-center gap-1.5 text-muted-foreground">
                            {isTakeover ? <Unlock className="h-3.5 w-3.5 text-orange-500" /> : <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                            Takeover
                        </Label>
                        <Switch
                            id="takeover-mode"
                            checked={isTakeover}
                            onCheckedChange={setIsTakeover}
                            className="h-4 w-7 data-[state=checked]:bg-orange-500"
                        />
                    </div>

                    <div className="h-5 w-px bg-zinc-200 mx-2" />

                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground">
                        <Search className="h-4.5 w-4.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground">
                        <MoreVertical className="h-4.5 w-4.5" />
                    </Button>
                </div>
            </div>

            {/* MESSAGES */}
            <ScrollArea className="flex-1 p-6 bg-card/50">
                <div className="flex flex-col gap-6 max-w-3xl mx-auto">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={cn(
                                "flex gap-3 max-w-[80%]",
                                msg.role === "user" ? "self-start" : "self-end flex-row-reverse"
                            )}
                        >
                            <div className={cn(
                                "h-9 w-9 rounded-full flex items-center justify-center shrink-0 border",
                                msg.role === "user" ? "bg-muted border-border" : (msg.role === "operator" ? "bg-orange-100 border-orange-200" : "bg-black border-black")
                            )}>
                                {msg.role === "user" ? (
                                    <span className="text-xs font-bold text-muted-foreground">{chat.name[0]}</span>
                                ) : (
                                    msg.role === "operator" ? <Bot size={16} className="text-orange-600" /> : <Bot size={16} className="text-white" />
                                )}
                            </div>

                            <div className={cn(
                                "rounded-2xl p-4 text-sm font-medium shadow-sm",
                                msg.role === "user" ? "bg-muted/50 border border-border text-foreground rounded-tl-sm" : "bg-primary text-primary-foreground border border-primary rounded-tr-sm",
                                msg.role === "operator" && "bg-orange-50 text-orange-950 border border-orange-100"
                            )}>
                                {msg.text}
                            </div>
                        </div>
                    ))}

                    {isTakeover && (
                        <div className="w-full flex justify-center my-4">
                            <span className="bg-orange-50 text-orange-700 text-xs font-medium px-3 py-1.5 rounded-full border border-orange-100 flex items-center gap-1.5 shadow-sm">
                                <Unlock className="h-3 w-3" />
                                Operator has taken control
                            </span>
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* INPUT */}
            <div className="p-6 pt-2 bg-card">
                <div className={cn(
                    "relative rounded-2xl border shadow-sm transition-all overflow-hidden",
                    isTakeover ? "ring-2 ring-orange-500/10 border-orange-200 bg-orange-50/10" : "border-border bg-card"
                )}>
                    {!isTakeover && (
                        <div className="absolute inset-0 z-10 bg-muted/50/60 backdrop-blur-[1px] flex items-center justify-center rounded-2xl">
                            <Button size="sm" variant="outline" onClick={() => setIsTakeover(true)} className="rounded-xl border-border shadow-sm bg-card hover:bg-muted/50 font-medium">
                                <Unlock className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                                Take Control to Reply
                            </Button>
                        </div>
                    )}
                    <Textarea
                        placeholder={isTakeover ? "Type your reply..." : "AI is handling this conversation..."}
                        className="min-h-[80px] w-full resize-none border-0 bg-transparent focus-visible:ring-0 p-4 text-foreground placeholder:text-muted-foreground font-medium"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault()
                                handleSend()
                            }
                        }}
                    />
                    <div className="flex items-center justify-between p-3 border-t border-border bg-muted/30">
                        <span className={cn(
                            "text-xs pl-2 font-medium flex items-center gap-2",
                            isTakeover ? "text-orange-600" : "text-muted-foreground"
                        )}>
                            {isTakeover ? (
                                <>
                                    <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                                    Sending as Operator
                                </>
                            ) : (
                                <>
                                    <span className="h-2 w-2 rounded-full bg-zinc-300" />
                                    Auto-pilot Active
                                </>
                            )}
                        </span>
                        <Button size="sm" className="h-9 px-4 rounded-xl bg-primary hover:bg-primary/90 shadow-sm font-medium" onClick={handleSend} disabled={!input.trim()}>
                            <Send className="mr-2 h-3.5 w-3.5" />
                            Send
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
