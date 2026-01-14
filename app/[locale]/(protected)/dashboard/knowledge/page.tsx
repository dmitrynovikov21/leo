"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { UploadCloud, FileText, Zap, X, Save, Loader2, Trash2, StickyNote, Plus } from "lucide-react"
import { toast } from "sonner"
import { AnimatePresence, motion } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

import { cn } from "@/lib/utils"
// NoteEditorDialog removed as per request
// import { NoteEditorDialog, Note } from "@/components/knowledge/note-editor-dialog"
import { createLibraryItem, getLibraryItems, deleteLibraryItem, LibraryItemWithChunks, getLibraryItemChunks, updateLibraryChunk } from "@/actions/library"
import { ScrollArea } from "@/components/ui/scroll-area"

export default function GlobalKnowledgePage() {
    const t = useTranslations('Knowledge')
    const tCommon = useTranslations('Common')

    const [items, setItems] = React.useState<LibraryItemWithChunks[]>([])
    const [isLoading, setIsLoading] = React.useState(true)

    // Upload / Parse State
    const [uploadedFile, setUploadedFile] = React.useState<{ name: string, file: File } | null>(null)
    const [isParsing, setIsParsing] = React.useState(false)
    const [chunks, setChunks] = React.useState<{ id: string, content: string }[]>([])
    const [isUploadDialogOpen, setIsUploadDialogOpen] = React.useState(false)
    const [isSaving, setIsSaving] = React.useState(false)
    const [isDragging, setIsDragging] = React.useState(false)

    // Note State - Removed
    // const [isNoteDialogOpen, setIsNoteDialogOpen] = React.useState(false)
    // const [editingNote, setEditingNote] = React.useState<Note | undefined>(undefined)

    // View Chunks State
    const [viewingItem, setViewingItem] = React.useState<LibraryItemWithChunks | null>(null)
    const [viewingChunks, setViewingChunks] = React.useState<any[]>([])
    const [isLoadingChunks, setIsLoadingChunks] = React.useState(false)
    const [editedChunks, setEditedChunks] = React.useState<Record<string, string>>({})
    const [isSavingChunk, setIsSavingChunk] = React.useState<string | null>(null)


    const fetchItems = React.useCallback(async () => {
        setIsLoading(true)
        try {
            const data = await getLibraryItems()
            setItems(data)
        } catch (error) {
            toast.error("Failed to fetch library")
        } finally {
            setIsLoading(false)
        }
    }, [])

    React.useEffect(() => {
        fetchItems()
    }, [fetchItems])


    // --- File Upload Logic ---
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploadedFile({ name: file.name, file })
        setIsParsing(true)

        try {
            const gatewayUrl = process.env.NEXT_PUBLIC_AI_GATEWAY_URL
            if (!gatewayUrl) {
                toast.error('AI Gateway URL is not configured')
                setIsParsing(false)
                return
            }

            const formData = new FormData()
            formData.append('file', file)

            const response = await fetch(`${gatewayUrl}/api/v1/documents/parse`, {
                method: 'POST',
                body: formData,
            })

            if (!response.ok) throw new Error('Failed to parse document')

            const data = await response.json()
            const parsedChunks = (data.chunks || []).map((chunk: any, index: number) => ({
                id: `chunk-${index}`,
                content: typeof chunk === 'string' ? chunk : chunk.content || chunk.text || '',
            }))

            setChunks(parsedChunks)
            toast.success('File parsed. Review chunks and save.')
        } catch (error) {
            console.error('Error parsing:', error)
            toast.error("Parsing failed")
            setUploadedFile(null)
        } finally {
            setIsParsing(false)
        }
    }

    // Handle dropped file
    const handleFileDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        const file = e.dataTransfer.files?.[0]
        if (file) {
            // Trigger the same logic as file select
            const fakeEvent = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>
            handleFileSelect(fakeEvent)
        }
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
    }

    const handleSaveFileToLibrary = async () => {
        if (!uploadedFile || chunks.length === 0) return

        setIsSaving(true)
        try {
            const result = await createLibraryItem({
                name: uploadedFile.name,
                type: 'FILE',
                fileSize: uploadedFile.file.size,
                mimeType: uploadedFile.file.type,
                chunks: chunks.map((c, i) => ({
                    content: c.content,
                    index: i
                }))
            })

            if (result.success) {
                toast.success("Saved to Library")
                setUploadedFile(null)
                setChunks([])
                setIsUploadDialogOpen(false)
                fetchItems()
            } else {
                toast.error("Failed to save")
            }
        } catch (error) {
            toast.error("Error saving")
        } finally {
            setIsSaving(false)
        }
    }


    // --- Note Logic Removed ---

    const handleDelete = async (id: string) => {
        if (confirm("Delete this item?")) {
            const res = await deleteLibraryItem(id)
            if (res.success) {
                toast.success("Deleted")
                fetchItems()
            } else {
                toast.error("Failed to delete")
            }
        }
    }

    const handleViewChunks = async (item: LibraryItemWithChunks) => {
        setViewingItem(item)
        setViewingChunks([])
        setEditedChunks({})
        setIsLoadingChunks(true)

        try {
            const chunks = await getLibraryItemChunks(item.id)
            setViewingChunks(chunks || [])
        } catch (err) {
            toast.error("Failed to load chunks")
        } finally {
            setIsLoadingChunks(false)
        }
    }

    const handleChunkContentChange = (chunkId: string, content: string) => {
        setEditedChunks(prev => ({ ...prev, [chunkId]: content }))
    }

    const handleSaveChunk = async (chunkId: string) => {
        const content = editedChunks[chunkId]
        if (content === undefined) return

        setIsSavingChunk(chunkId)
        try {
            const result = await updateLibraryChunk(chunkId, content)
            if (result.success) {
                toast.success("Чанк сохранён")
                // Update the local state
                setViewingChunks(prev => prev.map(c =>
                    c.id === chunkId ? { ...c, content } : c
                ))
                // Clear edited state for this chunk
                setEditedChunks(prev => {
                    const next = { ...prev }
                    delete next[chunkId]
                    return next
                })
            } else {
                toast.error("Не удалось сохранить")
            }
        } catch (err) {
            toast.error("Ошибка сохранения")
        } finally {
            setIsSavingChunk(null)
        }
    }


    return (
        <div className="container max-w-7xl py-8 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">База знаний</h1>
                    <p className="text-muted-foreground mt-2">
                        Глобальная библиотека файлов и заметок. Добавляйте сюда материалы, чтобы потом быстро подключать их к агентам.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Upload Card */}
                <div
                    className="border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors cursor-pointer group"
                    onClick={() => setIsUploadDialogOpen(true)}
                >
                    <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <UploadCloud className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-1">Загрузить файл</h3>
                    <p className="text-sm text-muted-foreground mb-4">PDF, DOCX, XLS, TXT, изображения (OCR). Будет автоматически разбит на чанки.</p>
                    <Button variant="secondary">Выбрать файл</Button>
                </div>


            </div>

            {/* Library List */}
            <div className="border rounded-xl bg-card">
                <div className="p-6 border-b">
                    <h2 className="text-xl font-semibold">Все материалы</h2>
                </div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Название</TableHead>
                            <TableHead>Тип</TableHead>
                            <TableHead>Чанков</TableHead>
                            <TableHead>Дата</TableHead>
                            <TableHead className="text-right">Действия</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Загрузка...</TableCell>
                            </TableRow>
                        ) : items.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Библиотека пуста</TableCell>
                            </TableRow>
                        ) : (
                            items.map((item) => (
                                <TableRow key={item.id} className="group">
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-md bg-muted">
                                                {item.type === 'NOTE' ? <StickyNote className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                                            </div>
                                            {item.name}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="uppercase text-[10px]">{item.type === 'NOTE' ? 'Заметка' : item.name.split('.').pop() || 'FILE'}</Badge>
                                    </TableCell>
                                    <TableCell>{item._count.chunks}</TableCell>
                                    <TableCell>{new Date(item.createdAt).toLocaleDateString()}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" onClick={() => handleViewChunks(item)}>Просмотр</Button>
                                        <Button variant="ghost" size="icon" className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDelete(item.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Upload Dialog */}
            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Загрузка файла</DialogTitle>
                    </DialogHeader>

                    {!uploadedFile ? (
                        <div
                            className={cn(
                                "flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg transition-colors",
                                isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 bg-muted/50"
                            )}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleFileDrop}
                        >
                            <Input
                                type="file"
                                className="hidden"
                                id="file-upload"
                                onChange={handleFileSelect}
                                accept=".txt,.md,.pdf,.docx,.doc,.xlsx,.xls,.png,.jpg,.jpeg,.webp,.bmp,.tiff,.tif,.gif"
                            />
                            <Label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                                <UploadCloud className={cn("h-10 w-10 mb-4 transition-colors", isDragging ? "text-primary" : "text-muted-foreground")} />
                                <span className="text-lg font-medium">{isDragging ? "Отпустите файл" : "Выберите или перетащите файл"}</span>
                                <span className="text-sm text-muted-foreground">PDF, DOCX, XLS, TXT, изображения. Максимум 50MB</span>
                            </Label>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex items-center gap-3">
                                    <FileText className="h-8 w-8 text-primary" />
                                    <div>
                                        <p className="font-medium">{uploadedFile.name}</p>
                                        <p className="text-xs text-muted-foreground">{(uploadedFile.file.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => {
                                    setUploadedFile(null)
                                    setChunks([])
                                }}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>

                            {isParsing ? (
                                <div className="flex flex-col items-center py-8 gap-3 text-muted-foreground">
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                    <p>Парсинг файла...</p>
                                </div>
                            ) : (
                                <ScrollArea className="h-[400px] border rounded-md p-4 bg-muted/30">
                                    <div className="space-y-6">
                                        {chunks.map((chunk, i) => (
                                            <div key={chunk.id} className="flex gap-4 items-start group">
                                                <span className="text-muted-foreground w-8 shrink-0 pt-3 text-xs font-mono">#{i + 1}</span>
                                                <div className="flex-1 space-y-2">
                                                    <Textarea
                                                        value={chunk.content}
                                                        onChange={(e) => {
                                                            const newChunks = [...chunks]
                                                            newChunks[i].content = e.target.value
                                                            setChunks(newChunks)
                                                        }}
                                                        className="min-h-[120px] bg-background resize-none text-sm leading-relaxed"
                                                    />
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={() => {
                                                        setChunks(chunks.filter((_, idx) => idx !== i))
                                                    }}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            )}

                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>Отмена</Button>
                                <Button onClick={handleSaveFileToLibrary} disabled={chunks.length === 0 || isSaving}>
                                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                    Сохранить в библиотеку
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>



            {/* View Chunks Dialog (Editable) */}
            <Dialog open={!!viewingItem} onOpenChange={(open) => !open && setViewingItem(null)}>
                <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Редактирование: {viewingItem?.name}</DialogTitle>
                    </DialogHeader>
                    {isLoadingChunks ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <ScrollArea className="h-[60vh] pr-4">
                            <div className="space-y-6">
                                {viewingChunks.map((chunk) => {
                                    const isEdited = editedChunks[chunk.id] !== undefined
                                    const currentContent = editedChunks[chunk.id] ?? chunk.content
                                    const isSaving = isSavingChunk === chunk.id

                                    return (
                                        <div key={chunk.id} className="p-4 rounded-lg border bg-muted/30 space-y-3">
                                            <div className="flex justify-between items-center">
                                                <Badge variant="outline">Чанк #{chunk.chunkIndex + 1}</Badge>
                                                {isEdited && (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleSaveChunk(chunk.id)}
                                                        disabled={isSaving}
                                                    >
                                                        {isSaving ? (
                                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                        ) : (
                                                            <Save className="h-4 w-4 mr-2" />
                                                        )}
                                                        Сохранить
                                                    </Button>
                                                )}
                                            </div>
                                            <Textarea
                                                value={currentContent}
                                                onChange={(e) => handleChunkContentChange(chunk.id, e.target.value)}
                                                className="min-h-[120px] max-h-[300px] text-sm leading-relaxed bg-background"
                                            />
                                        </div>
                                    )
                                })}
                            </div>
                        </ScrollArea>
                    )}
                </DialogContent>
            </Dialog>

        </div >
    )
}
