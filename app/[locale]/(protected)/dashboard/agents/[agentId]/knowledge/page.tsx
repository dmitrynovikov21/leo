"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { UploadCloud, FileText, Zap, X, Save, Loader2, Trash2, Wand2, StickyNote } from "lucide-react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { AnimatePresence, motion } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { SpaceSelector } from "@/components/knowledge/space-selector"
import { DocumentsTable } from "@/components/knowledge/documents-table"
import { cn } from "@/lib/utils"
import { NoteEditorDialog, Note } from "@/components/knowledge/note-editor-dialog"
import { BookOpen } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { getLibraryItems, getLibraryItemChunks, LibraryItemWithChunks } from "@/actions/library"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"


export default function KnowledgePage({ params }: { params: { agentId: string } }) {
    const t = useTranslations('Knowledge')
    const tCommon = useTranslations('Common')
    const { data: session } = useSession()

    // --- State ---
    const [documents, setDocuments] = React.useState<any[]>([])

    // Editor State
    const [uploadedFile, setUploadedFile] = React.useState<{ name: string, file: File } | null>(null)
    const [docMeta, setDocMeta] = React.useState<{ size: number, type: string } | null>(null)
    const [chunks, setChunks] = React.useState<{ id: string, content: string }[]>([])
    const [isParsing, setIsParsing] = React.useState(false)
    const [isSaving, setIsSaving] = React.useState(false)
    const [editorMode, setEditorMode] = React.useState<'idle' | 'parsing' | 'editing'>('idle')

    // Notes State
    const [notes, setNotes] = React.useState<Note[]>([])
    const [editingNote, setEditingNote] = React.useState<Note | undefined>(undefined)
    const [isNoteDialogOpen, setIsNoteDialogOpen] = React.useState(false)
    const [isSavingNote, setIsSavingNote] = React.useState(false)

    // Library Import State
    const [isLibraryDialogOpen, setIsLibraryDialogOpen] = React.useState(false)
    const [libraryItems, setLibraryItems] = React.useState<LibraryItemWithChunks[]>([])
    const [isLoadingLibrary, setIsLoadingLibrary] = React.useState(false)
    const [importingItem, setImportingItem] = React.useState<string | null>(null)
    const [isDragging, setIsDragging] = React.useState(false)

    // --- Handlers ---

    const fetchDocuments = React.useCallback(async () => {
        try {
            const gatewayUrl = process.env.NEXT_PUBLIC_AI_GATEWAY_URL
            if (!gatewayUrl) return

            const response = await fetch(`${gatewayUrl}/api/v1/agents/${params.agentId}/documents`, {
                cache: 'no-store',
                headers: {
                    'Pragma': 'no-cache'
                }
            })

            if (response.ok) {
                const data = await response.json()
                // Normalizing data to match Document interface
                const normalizedDocs = data.map((d: any) => ({
                    id: d.id,
                    name: d.filename || d.name,
                    type: d.type || (d.filename || '').split('.').pop() || 'file',
                    size: d.size || 'Unknown',
                    updatedAt: d.created_at ? new Date(d.created_at).toLocaleDateString() : 'Just now',
                    status: d.status || 'ready'
                }))
                setDocuments(normalizedDocs)
            }
        } catch (error) {
            console.error('Error fetching documents:', error)
            toast.error("Failed to refresh documents list")
        }
    }, [params.agentId])

    React.useEffect(() => {
        fetchDocuments()
        fetchNotes()
    }, [fetchDocuments])

    // --- Notes Handlers ---
    const fetchNotes = async () => {
        try {
            const orchestratorUrl = process.env.NEXT_PUBLIC_AGENT_ORCHESTRATOR_URL
            if (!orchestratorUrl) return

            const response = await fetch(`${orchestratorUrl}/api/v1/agents/${params.agentId}/notes`)
            if (response.ok) {
                const data = await response.json()
                setNotes(data || [])
            }
        } catch (error) {
            console.error('Error fetching notes:', error)
        }
    }

    const handleSaveNote = async (noteData: Partial<Note>) => {
        setIsSavingNote(true)
        try {
            const orchestratorUrl = process.env.NEXT_PUBLIC_AGENT_ORCHESTRATOR_URL
            if (!orchestratorUrl) {
                toast.error("Orchestrator URL not configured")
                return
            }

            const isEdit = !!noteData.id

            const response = await fetch(
                isEdit
                    ? `${orchestratorUrl}/api/v1/agents/${params.agentId}/notes/${noteData.id}`
                    : `${orchestratorUrl}/api/v1/agents/${params.agentId}/notes`,
                {
                    method: isEdit ? 'PUT' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: noteData.title,
                        content: noteData.content
                    })
                }
            )

            if (!response.ok) throw new Error('Failed to save note')

            toast.success(isEdit ? "Заметка обновлена и перевекторизована" : "Заметка создана и векторизована")
            fetchNotes()
            fetchDocuments() // Refresh documents list too
            setIsNoteDialogOpen(false)
            setEditingNote(undefined)
        } catch (error) {
            console.error('Error saving note:', error)
            toast.error("Ошибка сохранения заметки")
        } finally {
            setIsSavingNote(false)
        }
    }

    const handleDeleteNote = async (noteId: number | string) => {
        try {
            const orchestratorUrl = process.env.NEXT_PUBLIC_AGENT_ORCHESTRATOR_URL
            if (!orchestratorUrl) return

            const response = await fetch(
                `${orchestratorUrl}/api/v1/agents/${params.agentId}/notes/${noteId}`,
                { method: 'DELETE' }
            )

            if (response.ok) {
                toast.success("Заметка удалена")
                fetchNotes()
                fetchDocuments()
                setIsNoteDialogOpen(false)
                setEditingNote(undefined)
            } else {
                throw new Error('Failed to delete note')
            }
        } catch (error) {
            console.error('Error deleting note:', error)
            toast.error("Ошибка удаления заметки")
        }
    }

    const handleOpenCreateNote = () => {
        setEditingNote(undefined)
        setIsNoteDialogOpen(true)
    }

    const handleOpenEditNote = (note: Note) => {
        setEditingNote(note)
        setIsNoteDialogOpen(true)
        setIsNoteDialogOpen(true)
    }

    // Library Handler
    const handleOpenLibrary = async () => {
        setIsLibraryDialogOpen(true)
        setIsLoadingLibrary(true)
        try {
            const items = await getLibraryItems()
            setLibraryItems(items)
        } catch (error) {
            toast.error("Failed to load library")
        } finally {
            setIsLoadingLibrary(false)
        }
    }

    const handleImportFromLibrary = async (item: LibraryItemWithChunks) => {
        setImportingItem(item.id)
        try {
            const chunks = await getLibraryItemChunks(item.id)
            if (!chunks || chunks.length === 0) {
                toast.error("Item has no chunks")
                return
            }

            // Vectorize
            const gatewayUrl = process.env.NEXT_PUBLIC_AI_GATEWAY_URL
            if (!gatewayUrl) return

            const payload = {
                agentId: params.agentId,
                userId: session?.user?.id,
                filename: item.name,
                fileSize: item.fileSize || 0,
                mimeType: item.mimeType || item.type,
                chunks: chunks.map((c) => ({
                    index: c.chunkIndex,
                    text: c.content
                })),
            }

            const response = await fetch(`${gatewayUrl}/api/v1/documents/vectorize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            if (!response.ok) throw new Error('Failed to vectorize')

            toast.success('Imported from Library!')
            setIsLibraryDialogOpen(false)

            // Wait a bit for DB propagation then refresh
            setTimeout(() => {
                fetchDocuments()
                window.location.reload() // Force reload to be sure if router.refresh() is not enough for table state
            }, 1000)

        } catch (error) {
            console.error(error)
            toast.error("Import failed")
        } finally {
            setImportingItem(null)
        }
    }

    // 1. File Upload & Parsing
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploadedFile({ name: file.name, file })
        setDocMeta({ size: file.size, type: file.type })
        setEditorMode('parsing')
        setIsParsing(true)

        try {
            const gatewayUrl = process.env.NEXT_PUBLIC_AI_GATEWAY_URL

            if (!gatewayUrl) {
                toast.error('AI Gateway URL is not configured')
                setEditorMode('idle')
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
                id: `${file.name}-${index}`,
                content: typeof chunk === 'string' ? chunk : chunk.content || chunk.text || '',
            }))

            setChunks(parsedChunks)
            setEditorMode('editing')
            toast.success('Document parsed successfully')
        } catch (error) {
            console.error('Error parsing:', error)
            toast.error(tCommon('error'), { description: 'Failed to process file' })
            setUploadedFile(null)
            setEditorMode('idle')
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
            const fakeEvent = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>
            handleFileUpload(fakeEvent)
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

    // 2. Save / Vectorize
    const handleSaveChunks = async () => {
        if (chunks.length === 0) return

        setIsSaving(true)
        try {
            const gatewayUrl = process.env.NEXT_PUBLIC_AI_GATEWAY_URL

            if (!gatewayUrl) {
                toast.error('AI Gateway URL is not configured')
                setIsSaving(false)
                return
            }

            // Preparing payload
            // Use docMeta if available, fallback to file
            const finalSize = docMeta?.size ?? uploadedFile?.file?.size ?? 0
            const finalType = docMeta?.type || uploadedFile?.file?.type || 'application/octet-stream'

            const payload = {
                agentId: params.agentId,
                userId: session?.user?.id,
                filename: uploadedFile?.name || 'document',
                fileSize: finalSize,
                mimeType: finalType,
                chunks: chunks.map((c, index) => ({
                    index,
                    text: c.content
                })),
            }

            const response = await fetch(`${gatewayUrl}/api/v1/documents/vectorize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            if (!response.ok) throw new Error('Failed to vectorize')

            toast.success('Document vectorized and saved!')
            fetchDocuments()

            // Reset Editor
            setEditorMode('idle')
            setUploadedFile(null)
            setChunks([])
        } catch (error) {
            console.error('Error vectorizing:', error)
            toast.error(tCommon('error'), { description: 'Failed to save knowledge' })
        } finally {
            setIsSaving(false)
        }
    }

    // 3. Chunk Editing
    const handleChunkEdit = (id: string, newContent: string) => {
        setChunks(prev => prev.map(c => c.id === id ? { ...c, content: newContent } : c))
    }

    const handleRemoveChunk = (id: string) => {
        setChunks(prev => prev.filter(c => c.id !== id))
    }

    // 4. Document Actions
    const handleDeleteDocument = async (doc: any) => {
        try {
            const gatewayUrl = process.env.NEXT_PUBLIC_AI_GATEWAY_URL
            if (!gatewayUrl) return

            const response = await fetch(`${gatewayUrl}/api/v1/agents/${params.agentId}/documents/${doc.id}`, {
                method: 'DELETE'
            })

            if (response.ok) {
                toast.success("Document deleted")
                fetchDocuments()
            } else {
                throw new Error('Failed to delete')
            }
        } catch (error) {
            console.error('Error deleting document:', error)
            toast.error("Failed to delete document")
        }
    }

    const handleInspectDocument = async (doc: any) => {
        setEditorMode('parsing')
        try {
            const gatewayUrl = process.env.NEXT_PUBLIC_AI_GATEWAY_URL

            // Fetch chunks
            const response = await fetch(`${gatewayUrl}/api/v1/agents/${params.agentId}/documents/${doc.id}`)
            if (response.ok) {
                const data = await response.json()
                // Assuming data contains 'chunks' array
                const loadedChunks = (data.chunks || []).map((c: any, i: number) => ({
                    id: c.id || `${doc.id}-${i}`,
                    content: c.text || c.content
                }))

                // Set metadata from API response used for subsequent updates
                setDocMeta({
                    size: data.fileSize || data.file_size || data.size || 0,
                    type: data.mimeType || data.mime_type || data.type || 'application/octet-stream'
                })

                setUploadedFile({ name: doc.name, file: new File([], doc.name) })
                setChunks(loadedChunks)
                setEditorMode('editing')
                window.scrollTo({ top: 0, behavior: 'smooth' })
            } else {
                toast.error("Failed to load document details")
                setEditorMode('idle')
            }
        } catch (error) {
            console.error('Error inspecting:', error)
            toast.error("Failed to load document")
            setEditorMode('idle')
        }
    }

    return (
        <div className="h-full flex flex-col space-y-6">
            {/* Header / Space Selector - HIDDEN per user request */}
            {/* 
            <div className="flex flex-col gap-2 border-b pb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <SpaceSelector />
                    </div>
                </div>
            </div> 
            */}

            {/* --- TOP: UPLOAD & EDITOR AREA --- */}
            <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Zap size={14} className="text-primary" />
                    ДОБАВИТЬ / РЕДАКТИРОВАТЬ ЗНАНИЯ
                </h3>

                <AnimatePresence mode="wait">
                    {editorMode === 'idle' && (
                        <motion.div
                            key="upload-zone"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="grid grid-cols-1 md:grid-cols-2 gap-4"
                        >
                            {/* Upload File */}
                            <div
                                className={cn(
                                    "rounded-xl border border-dashed p-8 transition-colors",
                                    isDragging
                                        ? "border-primary bg-primary/5"
                                        : "border-zinc-300 bg-zinc-50/50 hover:bg-zinc-50 hover:border-primary/50"
                                )}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleFileDrop}
                            >
                                <label className="flex flex-col items-center justify-center cursor-pointer gap-3">
                                    <div className={cn("p-4 rounded-full bg-white shadow-sm border transition-colors", isDragging && "border-primary")}>
                                        <UploadCloud className={cn("h-6 w-6 transition-colors", isDragging ? "text-primary" : "text-primary")} />
                                    </div>
                                    <div className="text-center space-y-1">
                                        <p className="font-semibold text-zinc-900">
                                            {isDragging ? "Отпустите файл" : "Загрузить файл знаний"}
                                        </p>
                                        <p className="text-xs text-muted-foreground">PDF, DOCX, TXT, изображения. Перетащите или нажмите.</p>
                                    </div>
                                    <Input
                                        type="file"
                                        className="hidden"
                                        accept=".pdf,.doc,.docx,.txt,.md,.xlsx,.xls,.png,.jpg,.jpeg,.webp,.bmp,.tiff,.tif,.gif"
                                        onChange={handleFileUpload}
                                    />
                                </label>
                            </div>

                            {/* Import from Library */}
                            <div
                                className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/50 p-8 hover:bg-zinc-50 hover:border-primary/50 transition-colors cursor-pointer"
                                onClick={handleOpenLibrary}
                            >
                                <div className="flex flex-col items-center justify-center gap-3">
                                    <div className="p-4 rounded-full bg-white shadow-sm border">
                                        <BookOpen className="h-6 w-6 text-primary" />
                                    </div>
                                    <div className="text-center space-y-1">
                                        <p className="font-semibold text-zinc-900">Импорт из библиотеки</p>
                                        <p className="text-xs text-muted-foreground">Выбрать из готовых материалов</p>
                                    </div>
                                </div>
                            </div>

                            {/* Create Note */}
                            <div
                                onClick={handleOpenCreateNote}
                                className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/50 p-8 hover:bg-zinc-50 hover:border-amber-400/50 transition-colors cursor-pointer"
                            >
                                <div className="flex flex-col items-center justify-center gap-3">
                                    <div className="p-4 rounded-full bg-white shadow-sm border">
                                        <StickyNote className="h-6 w-6 text-amber-500" />
                                    </div>
                                    <div className="text-center space-y-1">
                                        <p className="font-semibold text-zinc-900">Добавить заметку</p>
                                        <p className="text-xs text-muted-foreground">Текстовая заметка с автовекторизацией.</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {editorMode === 'parsing' && (
                        <motion.div
                            key="parsing-zone"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="rounded-xl border bg-white p-8 flex flex-col items-center justify-center gap-4 min-h-[200px]"
                        >
                            <div className="relative">
                                <div className="h-12 w-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
                                <Wand2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
                            </div>
                            <div className="text-center">
                                <p className="font-medium">Анализируем {uploadedFile?.name}...</p>
                                <p className="text-xs text-muted-foreground">Извлекаем семантические чанки</p>
                            </div>
                        </motion.div>
                    )}

                    {editorMode === 'editing' && (
                        <motion.div
                            key="editor-zone"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            className="rounded-xl border bg-white shadow-sm overflow-hidden"
                        >
                            <div className="border-b px-4 py-3 bg-zinc-50/50 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-primary" />
                                    <span className="font-medium text-sm">{uploadedFile?.name}</span>
                                    <span className="text-xs text-muted-foreground">({chunks.length} чанков)</span>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 text-muted-foreground hover:text-destructive"
                                    onClick={() => {
                                        setEditorMode('idle')
                                        setUploadedFile(null)
                                        setChunks([])
                                    }}
                                >
                                    Отмена
                                </Button>
                            </div>

                            <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto bg-zinc-50/30">
                                {chunks.map((chunk, i) => (
                                    <div key={chunk.id} className="relative group bg-white rounded-lg border shadow-sm p-4 transition-all hover:shadow-md">
                                        <div className="flex items-start justify-between gap-4 mb-2">
                                            <Label className="text-xs font-mono text-muted-foreground uppercase">Сегмент {i + 1}</Label>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 -mr-2 -mt-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                                onClick={() => handleRemoveChunk(chunk.id)}
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        <Textarea
                                            value={chunk.content}
                                            onChange={(e) => handleChunkEdit(chunk.id, e.target.value)}
                                            className="min-h-[100px] text-sm resize-none border-0 bg-transparent focus-visible:ring-0 p-0 shadow-none"
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className="border-t p-4 bg-zinc-50/50 flex justify-end">
                                <Button
                                    onClick={handleSaveChunks}
                                    disabled={isSaving || chunks.length === 0}
                                    className="w-full sm:w-auto min-w-[150px]"
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Сохранение...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="mr-2 h-4 w-4" />
                                            Сохранить в базу знаний
                                        </>
                                    )}
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>


            {/* --- BOTTOM: LIST AREA --- */}
            <div className="flex-1 space-y-4 pt-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">ВСЕ РЕСУРСЫ</h3>
                </div>

                <div className="rounded-md border-0 bg-background/50 flex-1 overflow-hidden">
                    <DocumentsTable
                        docs={documents}
                        onRowClick={handleInspectDocument}
                        onInspect={handleInspectDocument}
                        onDelete={handleDeleteDocument}
                    />
                </div>
            </div>

            {/* Note Editor Dialog */}
            <NoteEditorDialog
                open={isNoteDialogOpen}
                onOpenChange={setIsNoteDialogOpen}
                note={editingNote}
                onSave={handleSaveNote}
                onDelete={handleDeleteNote}
            />
            {/* Library Import Dialog */}
            <Dialog open={isLibraryDialogOpen} onOpenChange={setIsLibraryDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Импорт из библиотеки</DialogTitle>
                    </DialogHeader>

                    <div className="min-h-[300px]">
                        {isLoadingLibrary ? (
                            <div className="flex items-center justify-center h-40">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : libraryItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                                <p>Библиотека пуста</p>
                                <Button variant="link" onClick={() => window.open('/dashboard/knowledge', '_blank')}>Перейти в библиотеку</Button>
                            </div>
                        ) : (
                            <ScrollArea className="h-[400px] pr-4">
                                <div className="space-y-2">
                                    {libraryItems.map((item) => (
                                        <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded bg-muted">
                                                    {item.type === 'NOTE' ? <StickyNote className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-sm">{item.name}</p>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                                                        <span>•</span>
                                                        <span>{item._count.chunks} chunks</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <Button
                                                size="sm"
                                                onClick={() => handleImportFromLibrary(item)}
                                                disabled={!!importingItem}
                                            >
                                                {importingItem === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Импорт"}
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
