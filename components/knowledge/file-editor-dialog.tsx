"use client"

import * as React from "react"
import { FileText, Save, Loader2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { getLibraryItemChunks, updateLibraryChunk } from "@/actions/library"
import { cn } from "@/lib/utils"

interface Chunk {
    id: string
    content: string
    chunkIndex: number
    metadata?: any
}

interface FileEditorDialogProps {
    file: {
        id: string
        name: string
        type?: string
        chunksCount?: number
        chunks?: Chunk[]
        isAgentDocument?: boolean
    } | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onSave?: (fileId: string, newContent: string) => void
    agentId?: string // For agent documents - needed to call Gateway API
}

export function FileEditorDialog({
    file,
    open,
    onOpenChange,
    onSave,
    agentId
}: FileEditorDialogProps) {
    const [chunks, setChunks] = React.useState<Chunk[]>([])
    const [isLoading, setIsLoading] = React.useState(false)
    const [editingChunkId, setEditingChunkId] = React.useState<string | null>(null)
    const [editedContent, setEditedContent] = React.useState("")
    const [isSaving, setIsSaving] = React.useState(false)

    // Load chunks when dialog opens
    React.useEffect(() => {
        if (open && file?.id) {
            // If chunks are passed directly (agent documents), use them
            if (file.chunks && Array.isArray(file.chunks)) {
                setChunks(file.chunks)
                setIsLoading(false)
            } else {
                // Otherwise load from library DB
                loadChunks()
            }
        }
    }, [open, file?.id, file?.chunks])

    const loadChunks = async () => {
        if (!file?.id) return

        setIsLoading(true)
        try {
            const data = await getLibraryItemChunks(file.id)
            setChunks(data || [])
        } catch (err) {
            console.error("Failed to load chunks:", err)
            toast.error("Не удалось загрузить чанки")
        } finally {
            setIsLoading(false)
        }
    }

    const startEditing = (chunk: Chunk) => {
        setEditingChunkId(chunk.id)
        setEditedContent(chunk.content)
    }

    const cancelEditing = () => {
        setEditingChunkId(null)
        setEditedContent("")
    }

    const saveChunk = async () => {
        if (!editingChunkId || !file) return

        setIsSaving(true)
        try {
            // For agent documents, use Gateway API
            if (file.isAgentDocument && agentId) {
                const gatewayUrl = process.env.NEXT_PUBLIC_AI_GATEWAY_URL
                if (!gatewayUrl) {
                    toast.error("Gateway URL not configured")
                    return
                }

                // Find the chunk being edited
                const chunk = chunks.find(c => c.id === editingChunkId)
                if (!chunk) {
                    toast.error("Чанк не найден")
                    return
                }

                // Check if this is a real chunk ID (not temporary like "chunk-0")
                if (editingChunkId.startsWith('chunk-')) {
                    toast.error("Невозможно сохранить: чанк не имеет ID в базе")
                    return
                }

                // Call Gateway PATCH endpoint for specific chunk
                const response = await fetch(
                    `${gatewayUrl}/api/v1/agents/${agentId}/documents/${file.id}/chunks/${editingChunkId}`,
                    {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text: editedContent })
                    }
                )

                if (response.ok) {
                    setChunks(prev => prev.map(c =>
                        c.id === editingChunkId
                            ? { ...c, content: editedContent }
                            : c
                    ))
                    setEditingChunkId(null)
                    setEditedContent("")
                    toast.success("Чанк сохранён")
                } else {
                    const errorData = await response.json().catch(() => ({}))
                    toast.error(errorData.error || "Ошибка сохранения")
                }
            } else {
                // For library items, use local Prisma action
                const result = await updateLibraryChunk(editingChunkId, editedContent)

                if (result.success) {
                    setChunks(prev => prev.map(c =>
                        c.id === editingChunkId
                            ? { ...c, content: editedContent }
                            : c
                    ))
                    setEditingChunkId(null)
                    setEditedContent("")
                    toast.success("Чанк сохранён")
                } else {
                    toast.error(result.error || "Ошибка сохранения")
                }
            }
        } catch (err) {
            console.error("Failed to save chunk:", err)
            toast.error("Ошибка сохранения")
        } finally {
            setIsSaving(false)
        }
    }

    if (!file) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[900px] h-[85vh] flex flex-col p-0">
                <DialogHeader className="p-6 pb-4 border-b">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-zinc-100">
                            <FileText className="h-5 w-5 text-zinc-600" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg">{file.name}</DialogTitle>
                            <p className="text-sm text-muted-foreground">
                                {chunks.length} чанков
                            </p>
                        </div>
                    </div>
                </DialogHeader>

                <ScrollArea className="flex-1 px-6 pr-8">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : chunks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                            <p className="text-muted-foreground">Чанки не найдены</p>
                            <p className="text-sm text-muted-foreground/70">
                                Файл ещё не был распарсен
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4 py-4">
                            {chunks.map((chunk, idx) => (
                                <div
                                    key={chunk.id}
                                    className={cn(
                                        "rounded-xl border p-4 transition-all",
                                        editingChunkId === chunk.id
                                            ? "border-primary bg-primary/5"
                                            : "border-zinc-200 bg-white hover:border-zinc-300"
                                    )}
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <Badge variant="outline" className="text-xs">
                                            Чанк {chunk.chunkIndex + 1}
                                        </Badge>
                                        {editingChunkId === chunk.id ? (
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={cancelEditing}
                                                    disabled={isSaving}
                                                >
                                                    Отмена
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={saveChunk}
                                                    disabled={isSaving}
                                                >
                                                    {isSaving ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <>
                                                            <Save className="h-3 w-3 mr-1" />
                                                            Сохранить
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        ) : (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => startEditing(chunk)}
                                            >
                                                Редактировать
                                            </Button>
                                        )}
                                    </div>

                                    {editingChunkId === chunk.id ? (
                                        <Textarea
                                            value={editedContent}
                                            onChange={(e) => setEditedContent(e.target.value)}
                                            className="min-h-[150px] font-mono text-sm"
                                            autoFocus
                                        />
                                    ) : (
                                        <p className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed">
                                            {chunk.content}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>

                <DialogFooter className="p-6 pt-4 border-t">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Закрыть
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
