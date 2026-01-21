"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { UploadCloud, Zap, Sparkles, Filter, Plus, Trash2, BookOpen } from "lucide-react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

import { getLibraryItems, getLibraryItemChunks, type LibraryItemWithChunks } from "@/actions/library"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DocumentsTable } from "@/components/knowledge/documents-table"
import { UploadDialog } from "@/components/knowledge/upload-dialog"
import { NoteEditorDialog } from "@/components/knowledge/note-editor-dialog"
import { FileEditorDialog } from "@/components/knowledge/file-editor-dialog"
import { TableEditorDialog } from "@/components/knowledge/table-editor-dialog"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { useUserData } from "@/components/providers/user-data-provider"

// Document type for UI display
interface Document {
    id: string
    name: string
    type: 'pdf' | 'docx' | 'txt' | 'md' | 'spreadsheet' | 'folder' | 'note'
    size: string
    chunksCount: number
    tokensUsage: number
    status: 'ready' | 'processing' | 'error' | 'vectorized'
    updatedAt: string
    errorMessage?: string
    parentId?: string | null
    content?: string
}

// Note type for API
interface Note {
    id: string
    title: string
    content: string
    createdAt?: string
    updatedAt?: string
}

interface AgentKnowledgeViewProps {
    agentId: string
}

// Helper to format bytes
function formatBytes(bytes: number) {
    if (!bytes) return '-'
    if (bytes < 1024) return `${bytes} B`
    else if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    else return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// Helper to convert MIME type to human-readable label
function mimeTypeToLabel(mimeType: string, filename?: string): string {
    if (!mimeType) return 'Файл'
    const mime = mimeType.toLowerCase()

    if (mime.includes('pdf')) return 'PDF'
    if (mime.includes('word') || mime.includes('docx')) return 'Word'
    if (mime.includes('excel') || mime.includes('spreadsheet') || mime.includes('xlsx')) return 'Excel'
    if (mime.includes('powerpoint') || mime.includes('pptx')) return 'PowerPoint'
    if (mime.includes('text/plain')) return 'Текст'
    if (mime.includes('markdown') || filename?.endsWith('.md')) return 'Markdown'
    if (mime.includes('image')) return 'Изображение'
    if (mime.includes('json')) return 'JSON'
    if (mime.includes('csv')) return 'CSV'

    // Fallback: extract extension from filename
    if (filename) {
        const ext = filename.split('.').pop()?.toUpperCase()
        if (ext) return ext
    }

    return 'Файл'
}

export function AgentKnowledgeView({ agentId }: AgentKnowledgeViewProps) {
    const t = useTranslations('Knowledge')
    const { data: session } = useSession()

    // State
    const [documents, setDocuments] = React.useState<Document[]>([])
    const [notes, setNotes] = React.useState<Note[]>([])
    const [isLoading, setIsLoading] = React.useState(true)
    const [isSearching, setIsSearching] = React.useState(false)
    const [internalAgentId, setInternalAgentId] = React.useState<string | null>(null) // Real UUID from DB

    // Drag & Drop State
    const [isDraggingGlobal, setIsDraggingGlobal] = React.useState(false)
    const [droppedFiles, setDroppedFiles] = React.useState<File[]>([])
    const [isUploadDialogOpen, setIsUploadDialogOpen] = React.useState(false)
    const [isNoteDialogOpen, setIsNoteDialogOpen] = React.useState(false)
    const [selectedNote, setSelectedNote] = React.useState<Document | null>(null)
    const [editingFile, setEditingFile] = React.useState<any>(null)
    const [editingTable, setEditingTable] = React.useState<any>(null)
    const [agentName, setAgentName] = React.useState<string>("")
    const [searchQuery, setSearchQuery] = React.useState("")

    // Library Import State
    const [isLibraryDialogOpen, setIsLibraryDialogOpen] = React.useState(false)
    const [libraryItems, setLibraryItems] = React.useState<LibraryItemWithChunks[]>([])
    const [isLoadingLibrary, setIsLoadingLibrary] = React.useState(false)
    const [importingItem, setImportingItem] = React.useState<string | null>(null)

    // Get agent from shared context (same as layout)
    const { agents } = useUserData()

    // Find agent on mount - use context instead of API call
    React.useEffect(() => {
        const agent = agents.find(a => a.id === agentId)
        if (agent) {
            setInternalAgentId(agent.id)
            setAgentName(agent.name)
        }
    }, [agents, agentId])

    // Fetch documents from agent API using real ID or state
    const fetchDocuments = React.useCallback(async (id?: string, search?: string) => {
        const targetId = id || internalAgentId
        if (!targetId) return

        try {
            const gatewayUrl = process.env.NEXT_PUBLIC_AI_GATEWAY_URL
            if (!gatewayUrl) return

            // Build URL with optional search parameter
            let url = `${gatewayUrl}/api/v1/agents/${targetId}/documents`
            if (search && search.trim().length > 0) {
                url += `?filename=${encodeURIComponent(search.trim())}`
            }

            const response = await fetch(url, {
                cache: 'no-store',
                headers: { 'Pragma': 'no-cache' }
            })

            if (response.ok) {
                const data = await response.json()
                // Filter out notes (filename starts with note_) - they are shown separately
                const filteredData = data.filter((d: any) => {
                    const filename = d.filename || d.name || ''
                    return !filename.startsWith('note_')
                })
                const normalizedDocs = filteredData.map((d: any) => {
                    const filename = d.filename || d.name || ''
                    const rawMimeType = d.mime_type || d.mimeType || d.type || ''
                    return {
                        id: d.id,
                        name: filename,
                        type: mimeTypeToLabel(rawMimeType, filename),
                        size: d.size || 'Unknown',
                        chunksCount: d.chunks_count || 0,
                        tokensUsage: (d.chunks_count || 0) * 500,
                        updatedAt: d.created_at ? new Date(d.created_at).toLocaleDateString() : 'Только что',
                        status: d.status || 'ready'
                    }
                })
                setDocuments(normalizedDocs)
            }
        } catch (error) {
            console.error('Error fetching documents:', error)
            toast.error("Не удалось загрузить документы")
        } finally {
            setIsSearching(false)
        }
    }, [internalAgentId])

    // Fetch notes from orchestrator API using real ID or state
    const fetchNotes = React.useCallback(async (id?: string) => {
        const targetId = id || internalAgentId
        if (!targetId) return

        try {
            const orchestratorUrl = process.env.NEXT_PUBLIC_AGENT_ORCHESTRATOR_URL
            if (!orchestratorUrl) return

            const response = await fetch(`${orchestratorUrl}/api/v1/agents/${targetId}/notes`)
            if (response.ok) {
                const data = await response.json()
                setNotes(data || [])
            }
        } catch (error) {
            console.error('Error fetching notes:', error)
        }
    }, [internalAgentId])

    // Load documents/notes when agent ID becomes available
    React.useEffect(() => {
        const loadData = async () => {
            if (!internalAgentId) return
            setIsLoading(true)
            await Promise.all([fetchDocuments(internalAgentId), fetchNotes(internalAgentId)])
            setIsLoading(false)
        }
        loadData()
    }, [internalAgentId, fetchDocuments, fetchNotes])

    // Debounced search effect
    React.useEffect(() => {
        if (!internalAgentId) return

        const debounceTimer = setTimeout(() => {
            setIsSearching(true)
            fetchDocuments(internalAgentId, searchQuery || undefined)
        }, 300)

        return () => clearTimeout(debounceTimer)
    }, [searchQuery, internalAgentId, fetchDocuments])

    // Note handlers
    const handleSaveNote = async (noteData: { id?: string, title: string, content: string }) => {
        if (!internalAgentId) {
            toast.error("Ошибка: ID агента не найден", { description: "Попробуйте обновить страницу" })
            return
        }
        try {
            const orchestratorUrl = process.env.NEXT_PUBLIC_AGENT_ORCHESTRATOR_URL
            const gatewayUrl = process.env.NEXT_PUBLIC_AI_GATEWAY_URL
            if (!orchestratorUrl) {
                toast.error("Orchestrator URL not configured")
                return
            }

            const isEdit = !!noteData.id
            const response = await fetch(
                isEdit
                    ? `${orchestratorUrl}/api/v1/agents/${internalAgentId}/notes/${noteData.id}`
                    : `${orchestratorUrl}/api/v1/agents/${internalAgentId}/notes`,
                {
                    method: isEdit ? 'PUT' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title: noteData.title, content: noteData.content }),
                }
            )

            if (response.ok) {
                // Also vectorize the note for RAG
                if (gatewayUrl) {
                    try {
                        await fetch(`${gatewayUrl}/api/v1/documents/vectorize`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                agentId: internalAgentId,
                                userId: session?.user?.id,
                                filename: `note_${noteData.title}`,
                                fileSize: noteData.content.length,
                                mimeType: 'text/plain',
                                chunks: [{ index: 0, text: noteData.content }],
                            }),
                        })
                    } catch (vecErr) {
                        console.warn('Note vectorization failed:', vecErr)
                    }
                }

                toast.success(isEdit ? "Заметка обновлена" : "Заметка создана")
                setIsNoteDialogOpen(false)
                setSelectedNote(null)
                fetchNotes()
            } else {
                toast.error("Ошибка сохранения заметки")
            }
        } catch (error) {
            console.error('Error saving note:', error)
            toast.error("Ошибка сохранения заметки")
        }
    }

    const handleDeleteNote = async (id: string) => {
        if (!internalAgentId) {
            toast.error("Ошибка: ID агента не найден")
            return
        }
        try {
            const orchestratorUrl = process.env.NEXT_PUBLIC_AGENT_ORCHESTRATOR_URL
            if (!orchestratorUrl) return

            const response = await fetch(`${orchestratorUrl}/api/v1/agents/${internalAgentId}/notes/${id}`, {
                method: 'DELETE',
            })

            if (response.ok) {
                toast.success("Заметка удалена")
                setIsNoteDialogOpen(false)
                setSelectedNote(null)
                fetchNotes()
            }
        } catch (error) {
            toast.error("Ошибка удаления")
        }
    }

    // Delete document
    const handleDeleteDocument = async (id: string) => {
        if (!internalAgentId) {
            toast.error("Ошибка: ID агента не найден")
            return
        }
        try {
            const gatewayUrl = process.env.NEXT_PUBLIC_AI_GATEWAY_URL
            if (!gatewayUrl) return

            await fetch(`${gatewayUrl}/api/v1/agents/${internalAgentId}/documents/${id}`, {
                method: 'DELETE',
            })
            setDocuments(documents.filter(d => d.id !== id))
            toast.success("Документ удалён")
        } catch (err) {
            toast.error("Ошибка удаления")
        }
    }

    // Library Import
    const handleOpenLibrary = async () => {
        setIsLibraryDialogOpen(true)
        setIsLoadingLibrary(true)
        try {
            const items = await getLibraryItems()
            setLibraryItems(items)
        } catch (error) {
            toast.error("Не удалось загрузить библиотеку")
        } finally {
            setIsLoadingLibrary(false)
        }
    }

    const handleImportFromLibrary = async (item: LibraryItemWithChunks) => {
        if (!internalAgentId) {
            toast.error("Ошибка: ID агента не найден")
            return
        }
        setImportingItem(item.id)
        try {
            // Check if this is a NOTE type - import as agent note
            if (item.type?.toUpperCase() === 'NOTE') {
                const orchestratorUrl = process.env.NEXT_PUBLIC_AGENT_ORCHESTRATOR_URL
                const gatewayUrl = process.env.NEXT_PUBLIC_AI_GATEWAY_URL
                if (!orchestratorUrl) {
                    toast.error("Orchestrator URL not configured")
                    return
                }

                // Create as agent note
                const noteResponse = await fetch(`${orchestratorUrl}/api/v1/agents/${internalAgentId}/notes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title: item.name, content: item.content || '' }),
                })

                if (!noteResponse.ok) throw new Error('Failed to create note')

                // Also vectorize for RAG
                if (gatewayUrl && item.content) {
                    await fetch(`${gatewayUrl}/api/v1/documents/vectorize`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            agentId: internalAgentId,
                            userId: session?.user?.id,
                            filename: `note_${item.name}`,
                            fileSize: item.content.length,
                            mimeType: 'text/plain',
                            chunks: [{ index: 0, text: item.content }],
                        }),
                    })
                }

                toast.success('Заметка импортирована!')
                setIsLibraryDialogOpen(false)
                fetchNotes()
                return
            }

            // Regular file import
            const chunks = await getLibraryItemChunks(item.id)
            if (!chunks || chunks.length === 0) {
                toast.error("Файл не содержит чанков")
                return
            }

            const gatewayUrl = process.env.NEXT_PUBLIC_AI_GATEWAY_URL
            if (!gatewayUrl) return

            const payload = {
                agentId: internalAgentId,
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

            toast.success('Импортировано из библиотеки!')
            setIsLibraryDialogOpen(false)
            setTimeout(() => fetchDocuments(), 1000)
        } catch (error) {
            toast.error("Ошибка импорта")
        } finally {
            setImportingItem(null)
        }
    }

    // Save document content handler
    const handleSaveFile = async (id: string | number, content: string) => {
        if (!internalAgentId) {
            toast.error("Ошибка: ID агента не найден")
            return
        }
        try {
            const gatewayUrl = process.env.NEXT_PUBLIC_AI_GATEWAY_URL
            if (!gatewayUrl) {
                toast.error("Gateway URL not configured")
                return
            }

            // Call PUT endpoint we just created
            const response = await fetch(`${gatewayUrl}/api/v1/agents/${internalAgentId}/documents/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
            })

            if (response.ok) {
                toast.success("Документ обновлен и переиндексирован")
                setEditingFile(null)
                fetchDocuments() // Refresh list
            } else {
                throw new Error("Failed to update document")
            }
        } catch (error) {
            console.error('Error updating file:', error)
            toast.error("Не удалось сохранить изменения")
        }
    }

    // File click handler
    const handleFileClick = async (doc: Document) => {
        if (doc.type === 'note') {
            setSelectedNote(doc)
            setIsNoteDialogOpen(true)
        } else if (doc.type === 'spreadsheet') {
            setEditingTable(doc)
        } else {
            // Fetch real chunks/content for file editor
            try {
                const gatewayUrl = process.env.NEXT_PUBLIC_AI_GATEWAY_URL
                if (gatewayUrl && internalAgentId) {
                    // Use standard GET endpoint which returns { chunks: [...] }
                    const response = await fetch(`${gatewayUrl}/api/v1/agents/${internalAgentId}/documents/${doc.id}`)
                    if (response.ok) {
                        const data = await response.json()
                        // Map chunks to format expected by FileEditorDialog
                        const chunks = (data.chunks || []).map((c: any, index: number) => ({
                            id: c.id || `chunk-${index}`,
                            content: c.text || c.content || '',
                            chunkIndex: index
                        }))
                        // Pass chunks directly to the editor
                        setEditingFile({
                            ...doc,
                            chunks,
                            chunksCount: chunks.length,
                            isAgentDocument: true // Flag to indicate this is from agent API
                        })
                    } else {
                        setEditingFile(doc) // Fallback
                    }
                } else {
                    setEditingFile(doc)
                }
            } catch (e) {
                console.error("Failed to fetch chunks", e)
                setEditingFile(doc)
            }
        }
    }

    // Drag & Drop
    const handleGlobalDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        if (!internalAgentId) return // Disable if agent not resolved
        if (!isDraggingGlobal) setIsDraggingGlobal(true)
    }

    const handleGlobalDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        if (e.currentTarget.contains(e.relatedTarget as Node)) return
        setIsDraggingGlobal(false)
    }

    const handleGlobalDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDraggingGlobal(false)
        if (!internalAgentId) {
            toast.error("Агент не найден")
            return
        }
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const files = Array.from(e.dataTransfer.files)
            setDroppedFiles(files)
            setIsUploadDialogOpen(true)
        }
    }

    // Loading state
    if (isLoading) {
        return (
            <div className="h-full flex flex-col space-y-6 p-6">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-9 w-32" />
                </div>
                <div className="space-y-2">
                    {[1, 2, 3, 4].map(i => (
                        <Skeleton key={i} className="h-14 w-full rounded-xl" />
                    ))}
                </div>
            </div>
        )
    }

    const noteDocs = notes.map(n => ({
        id: n.id,
        name: n.title,
        type: 'note' as const,
        size: '-',
        chunksCount: 1,
        tokensUsage: 0,
        status: 'ready' as const,
        updatedAt: 'Только что',
        content: n.content
    }))

    return (
        <div
            className="flex flex-col min-h-full w-full relative bg-background"
            onDragOver={handleGlobalDragOver}
            onDragLeave={handleGlobalDragLeave}
            onDrop={handleGlobalDrop}
        >
            {/* Drag Overlay */}
            {isDraggingGlobal && (
                <div className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-sm flex items-center justify-center pointer-events-none transition-all duration-300">
                    <div className="bg-white/90 backdrop-blur-md p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-200 border border-white/20">
                        <div className="p-5 rounded-full bg-zinc-900/5 shadow-inner">
                            <UploadCloud className="h-10 w-10 text-zinc-900 animate-bounce" />
                        </div>
                        <div className="text-center space-y-1">
                            <h3 className="text-xl font-bold text-zinc-900 tracking-tight">Отпустите файлы</h3>
                            <p className="text-zinc-500 font-medium">для добавления в базу знаний агента</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Dialogs */}
            <UploadDialog
                open={isUploadDialogOpen}
                onOpenChange={setIsUploadDialogOpen}
                externalFiles={droppedFiles}
                agentId={internalAgentId || ''}
                onUploadComplete={() => fetchDocuments()}
            />

            <NoteEditorDialog
                open={isNoteDialogOpen}
                onOpenChange={(open) => {
                    setIsNoteDialogOpen(open)
                    if (!open) setSelectedNote(null)
                }}
                initialNote={selectedNote ? {
                    id: selectedNote.id,
                    title: selectedNote.name,
                    content: selectedNote.content || ''
                } : undefined}
                onSave={handleSaveNote}
                onDelete={selectedNote ? () => handleDeleteNote(selectedNote.id) : undefined}
            />

            <FileEditorDialog
                open={!!editingFile}
                onOpenChange={(open) => !open && setEditingFile(null)}
                file={editingFile}
                onSave={handleSaveFile}
            />

            <TableEditorDialog
                open={!!editingTable}
                onOpenChange={(open) => !open && setEditingTable(null)}
                file={editingTable}
                onSave={(id, data) => setEditingTable(null)}
            />

            {/* Library Import Dialog */}
            <Dialog open={isLibraryDialogOpen} onOpenChange={setIsLibraryDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <BookOpen className="h-5 w-5" />
                            Импорт из библиотеки
                        </DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="max-h-[400px]">
                        {isLoadingLibrary ? (
                            <div className="space-y-2 p-4">
                                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                            </div>
                        ) : libraryItems.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">Библиотека пуста</p>
                        ) : (
                            <div className="space-y-2 p-2">
                                {libraryItems.map(item => (
                                    <div
                                        key={item.id}
                                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                                        onClick={() => handleImportFromLibrary(item)}
                                    >
                                        <div>
                                            <p className="font-medium">{item.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {item._count.chunks} чанков • {item.fileSize ? formatBytes(item.fileSize) : '-'}
                                            </p>
                                        </div>
                                        <Badge variant={importingItem === item.id ? "secondary" : "outline"}>
                                            {importingItem === item.id ? "Импорт..." : "Импортировать"}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </DialogContent>
            </Dialog>

            {/* Header Section */}
            <div className="relative bg-background flex-none p-6 pb-2 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
                                {agentName ? `agent — ${agentName}` : 'База знаний агента'}
                            </h1>
                            {!internalAgentId && !isLoading && (
                                <Badge variant="destructive" className="animate-pulse">
                                    Ошибка подключения
                                </Badge>
                            )}
                        </div>
                        <p className="text-zinc-500 mt-2">
                            Управляйте документами и заметками, которые формируют знания вашего агента.
                        </p>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-4">
                    <div className="flex items-center gap-3">
                        <Input
                            placeholder="Поиск файлов..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-9 w-[240px] rounded-xl border-transparent bg-zinc-100/50 focus:bg-white focus:ring-2 focus:ring-zinc-200 transition-all font-medium text-zinc-900 pl-3 shadow-none placeholder:text-zinc-400"
                        />
                        <Button variant="outline" size="sm" className="h-9 rounded-xl border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 hover:border-zinc-300 shadow-sm">
                            <Filter className="h-4 w-4 mr-2" />
                            Фильтр
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button size="sm" className="h-9 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 shadow-[0_2px_8px_rgba(0,0,0,0.12)] border border-zinc-800/50 pl-3 pr-4 transition-all active:scale-95">
                                    <Plus className="h-4 w-4 mr-1.5" />
                                    Добавить
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 p-1 rounded-xl shadow-xl border-zinc-100">
                                <DropdownMenuLabel className="text-xs font-medium text-zinc-400 px-3 py-2 uppercase tracking-wider">
                                    Действия
                                </DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => setIsUploadDialogOpen(true)} className="rounded-lg py-2.5 px-3 cursor-pointer hover:bg-zinc-100 focus:bg-zinc-100 focus:text-zinc-900">
                                    <div className="mr-3 text-zinc-500">
                                        <UploadCloud className="h-4 w-4" />
                                    </div>
                                    <span className="font-medium">Загрузить файлы</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setSelectedNote(null); setIsNoteDialogOpen(true) }} className="rounded-lg py-2.5 px-3 cursor-pointer hover:bg-zinc-100 focus:bg-zinc-100 focus:text-zinc-900">
                                    <div className="mr-3 text-amber-600">
                                        <Sparkles className="h-4 w-4" />
                                    </div>
                                    <span className="font-medium">Создать заметку</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="my-1 bg-zinc-100" />
                                <DropdownMenuItem onClick={handleOpenLibrary} className="rounded-lg py-2.5 px-3 cursor-pointer hover:bg-zinc-100 focus:bg-zinc-100 focus:text-zinc-900">
                                    <div className="mr-3 text-blue-600">
                                        <BookOpen className="h-4 w-4" />
                                    </div>
                                    <span className="font-medium">Импорт из библиотеки</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 px-6 pb-20">
                <div className="space-y-8">
                    {/* Notes Section */}
                    {noteDocs.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                                <Sparkles className="h-4 w-4" /> Заметки агента
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {noteDocs.map((note) => (
                                    <Card
                                        key={note.id}
                                        className="rounded-2xl border-zinc-200/50 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:border-zinc-300 transition-colors cursor-pointer"
                                        onClick={() => handleFileClick(note)}
                                    >
                                        <CardHeader className="p-4">
                                            <CardTitle className="text-sm font-semibold text-zinc-900">{note.name}</CardTitle>
                                            <CardDescription className="text-xs text-zinc-500 line-clamp-2">{note.content}</CardDescription>
                                        </CardHeader>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Documents Table */}
                    <div className="pb-10">
                        <DocumentsTable
                            docs={documents}
                            onRowClick={handleFileClick}
                            onDelete={(doc) => handleDeleteDocument(doc.id)}
                        />
                    </div>
                </div>
            </div>
        </div >
    )
}
