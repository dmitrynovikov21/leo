"use client"

import * as React from "react"
import { Pencil, Loader2, Check } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

interface ConflictValueEditorProps {
    value: string
    onSave: (newValue: string) => Promise<void>
    className?: string
}

export function ConflictValueEditor({ value, onSave, className }: ConflictValueEditorProps) {
    const [isEditing, setIsEditing] = React.useState(false)
    const [currentValue, setCurrentValue] = React.useState(value)
    const [isSaving, setIsSaving] = React.useState(false)

    const handleStartEdit = () => {
        setIsEditing(true)
        setCurrentValue(value)
    }

    const handleSave = async () => {
        if (currentValue === value) {
            setIsEditing(false)
            return
        }

        setIsSaving(true)
        try {
            await onSave(currentValue)
            setIsEditing(false)
        } catch (error) {
            console.error("Failed to save", error)
            // Keep editing if failed?
        } finally {
            setIsSaving(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSave()
        }
        if (e.key === 'Escape') {
            setIsEditing(false)
            setCurrentValue(value)
        }
    }

    if (isSaving) {
        return (
            <div className={cn("flex items-center gap-2 text-sm text-zinc-500 animate-pulse", className)}>
                <Loader2 className="h-4 w-4 animate-spin" />
                Сохранение...
            </div>
        )
    }

    if (isEditing) {
        return (
            <Textarea
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                className={cn("min-h-[60px] resize-none bg-white text-sm", className)}
                autoFocus
            />
        )
    }

    return (
        <div
            onClick={handleStartEdit}
            className={cn(
                "group relative cursor-pointer rounded-lg border border-transparent hover:border-zinc-200 hover:bg-white transition-all px-2 py-1 -mx-2",
                className
            )}
        >
            <span className="font-mono text-sm text-zinc-900 block break-words">
                {value}
            </span>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Pencil className="h-3.5 w-3.5 text-zinc-400" />
            </div>
        </div>
    )
}
