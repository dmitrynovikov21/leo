"use client"

import * as React from "react"
import { ThumbsUp, ThumbsDown, Check, Loader2, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export function ChatFeedback({ messageId }: { messageId: string }) {
    const [status, setStatus] = React.useState<"idle" | "negative" | "tuning" | "fixed">("idle")
    const [val, setVal] = React.useState<"up" | "down" | null>(null)
    const [issue, setIssue] = React.useState("")

    const handleVote = (vote: "up" | "down") => {
        setVal(vote)
        if (vote === "down") {
            setStatus("negative")
        } else {
            toast.success("Спасибо за отзыв!")
        }
    }

    const handleSubmitIssue = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!issue.trim()) return

        setStatus("tuning")
        // Mock API call to tune model
        await new Promise(r => setTimeout(r, 1500))

        setStatus("fixed")
        toast.success("Инструкция обновлена", {
            description: "Мы добавили новое правило на основе вашего отзыва."
        })
    }

    if (status === "fixed") {
        return (
            <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium animate-in fade-in">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100">
                    <Check className="h-3 w-3" />
                </div>
                Исправлено!
                <Button variant="link" className="h-auto p-0 text-emerald-600 text-xs ml-2" onClick={() => setStatus("idle")}>
                    Отменить
                </Button>
            </div>
        )
    }

    if (status === "tuning") {
        return (
            <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
                <Loader2 className="h-3 w-3 animate-spin" />
                Настройка поведения агента...
            </div>
        )
    }

    if (status === "negative") {
        return (
            <form onSubmit={handleSubmitIssue} className="flex items-center gap-2 animate-in slide-in-from-left-2">
                <Input
                    autoFocus
                    value={issue}
                    onChange={(e) => setIssue(e.target.value)}
                    placeholder="Что пошло не так?"
                    className="h-7 text-xs w-[200px]"
                />
                <Button size="sm" type="submit" className="h-7 px-2" disabled={!issue}>
                    <ArrowRight className="h-3 w-3" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setStatus("idle")}
                >
                    &times;
                </Button>
            </form>
        )
    }

    return (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
                variant="ghost"
                size="sm"
                onClick={() => handleVote("up")}
                className={cn("h-6 w-6 p-0 hover:bg-green-50 hover:text-green-600", val === "up" && "text-green-600 bg-green-50")}
            >
                <ThumbsUp className="h-3 w-3" />
            </Button>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => handleVote("down")}
                className={cn("h-6 w-6 p-0 hover:bg-red-50 hover:text-red-600", val === "down" && "text-red-600 bg-red-50")}
            >
                <ThumbsDown className="h-3 w-3" />
            </Button>
        </div>
    )
}
