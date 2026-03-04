"use client"

import * as React from "react"
import { Check, AlertTriangle, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export interface KnowledgeConflict {
    id: string
    topic: string
    details: {
        conflict_summary: string
        description: string
        chunks_involved?: Array<{
            chunk_id?: string
            id?: string // Fallback
            file_id?: string
            text?: string
            text_snippet?: string
        }>
        chunks?: Array<{ // Fallback alias
            chunk_id?: string
            id?: string
            text?: string
            text_snippet?: string
        }>
    }
    status: 'NEW' | 'RESOLVED' | 'IGNORED'
    detectedAt: string
}

interface ConflictResolverDialogProps {
    conflict: KnowledgeConflict | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onResolve: (conflictId: string) => void
    agentId: string
}

export function ConflictResolverDialog({
    conflict,
    open,
    onOpenChange,
    onResolve,
    agentId
}: ConflictResolverDialogProps) {
    const [selectedChunkId, setSelectedChunkId] = React.useState<string | null>(null)
    const [editedContent, setEditedContent] = React.useState("")
    const [isSaving, setIsSaving] = React.useState(false)
    const [isDeleting, setIsDeleting] = React.useState(false)

    const handleDismiss = async () => {
        if (!conflict) return
        setIsDeleting(true)
        try {
            const response = await fetch(`/api/v1/conflicts/${conflict.id}`, {
                method: 'DELETE'
            })
            if (!response.ok) throw new Error("Failed to delete")

            toast.success("Конфликт удален из списка")
            onResolve(conflict.id)
            onOpenChange(false)
        } catch (error) {
            console.error(error)
            toast.error("Не удалось удалить конфликт")
        } finally {
            setIsDeleting(false)
        }
    }

    // Reset state when conflict changes
    // Reset state when conflict changes
    React.useEffect(() => {
        const chunks = conflict?.details?.chunks_involved || conflict?.details?.chunks || []
        if (chunks.length > 0) {
            // Default to first chunk or null
            setSelectedChunkId(null)
            setEditedContent("")
        }
    }, [conflict])

    const handleChunkSelect = (chunkId: string, content: string) => {
        setSelectedChunkId(chunkId)
        setEditedContent(content)
    }

    const handleSave = async () => {
        if (!conflict || !selectedChunkId || !editedContent.trim()) return

        setIsSaving(true)
        try {
            // PATCH to update chunk and resolve conflict
            const response = await fetch(`/api/v1/agents/${agentId}/kb/chunks/${selectedChunkId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: editedContent })
            })

            if (!response.ok) throw new Error("Failed to update chunk")

            toast.success("Конфликт разрешен")
            onResolve(conflict.id)
            onOpenChange(false)
        } catch (error) {
            console.error(error)
            toast.error("Не удалось сохранить изменения")
        } finally {
            setIsSaving(false)
        }
    }

    if (!conflict) return null

    const chunks = conflict.details?.chunks_involved || conflict.details?.chunks || []

    const getChunkId = (c: any) => c.chunk_id || c.id
    const getChunkText = (c: any) => c.text || c.text_snippet || ''

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl h-[80vh] flex flex-col p-0 gap-0 sm:rounded-xl overflow-hidden bg-muted/50 dark:bg-zinc-950">
                <div className="flex items-center justify-between px-6 py-4 border-b bg-card dark:bg-zinc-900">
                    <div className="space-y-1">
                        <DialogTitle className="flex items-center gap-2 text-lg">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                            {conflict.topic}
                        </DialogTitle>
                        <DialogDescription>
                            {conflict.details?.description}
                        </DialogDescription>
                    </div>
                    <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                        Обнаружен {new Date(conflict.detectedAt).toLocaleDateString()}
                    </Badge>
                </div>

                <div className="flex-1 overflow-hidden grid grid-cols-2 divide-x divide-zinc-200 dark:divide-zinc-800">
                    {chunks.length === 0 ? (
                        <div className="col-span-2 flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                            <AlertTriangle className="h-12 w-12 text-muted-foreground/60 mb-4" />
                            <p className="text-lg font-medium">Нет связанных фрагментов</p>
                            <p className="text-sm">ИИ не смог определить конкретные участки текста для этого конфликта.</p>
                            <div className="flex gap-2 mt-6">
                                <Button
                                    variant="outline"
                                    onClick={() => onOpenChange(false)}
                                >
                                    Закрыть
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={handleDismiss}
                                    disabled={isDeleting}
                                >
                                    Удалить проблему
                                </Button>
                            </div>
                        </div>
                    ) : chunks.map((chunk, idx) => {
                        const chunkId = getChunkId(chunk)
                        const chunkText = getChunkText(chunk)

                        return (
                            <div key={chunkId || idx} className="flex flex-col h-full bg-card dark:bg-zinc-900/50">
                                <div className="p-4 border-b border-border bg-muted/30 text-sm font-medium text-muted-foreground flex justify-between items-center">
                                    <span>Вариант {idx + 1}</span>
                                    {selectedChunkId === chunkId && (
                                        <Badge className="bg-blue-600">Редактируется</Badge>
                                    )}
                                </div>

                                <div className="flex-1 p-6 overflow-y-auto">
                                    {selectedChunkId === chunkId ? (
                                        <Textarea
                                            value={editedContent}
                                            onChange={(e) => setEditedContent(e.target.value)}
                                            className="min-h-[300px] h-full font-mono text-sm leading-relaxed resize-none border-blue-200 focus:border-blue-400 focus:ring-blue-100"
                                        />
                                    ) : (
                                        <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap font-mono text-sm">
                                            {chunkText}
                                        </div>
                                    )}
                                </div>

                                <div className="p-4 border-t border-border bg-muted/30 flex justify-end">
                                    {selectedChunkId === chunkId ? (
                                        <div className="flex gap-2">
                                            <Button variant="ghost" size="sm" onClick={() => setSelectedChunkId(null)}>
                                                Отмена
                                            </Button>
                                            <Button size="sm" onClick={handleSave} disabled={isSaving}>
                                                Сохранить исправление
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleChunkSelect(chunkId, chunkText)}
                                            className="hover:border-blue-300 hover:text-blue-600"
                                        >
                                            Исправить этот вариант
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </DialogContent>
        </Dialog>
    )
}
