"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { UploadCloud, Zap, Table as TableIcon, Sparkles, Filter, Lock, ChevronLeft, ChevronDown, Check, Plus, Trash2, FileText, Image } from "lucide-react"

import { createLibraryItem, getLibraryItems, deleteLibraryItem, updateLibraryItem, clearLibrary, type LibraryItemWithChunks } from "@/actions/library"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { EmojiAvatar } from "@/components/shared/emoji-avatar"
import { SpaceSelector } from "@/components/knowledge/space-selector"
import { FolderSelector } from "@/components/knowledge/folder-selector"
import { AgentKnowledgeView } from "@/components/knowledge/agent-knowledge-view"
import { useUserData } from "@/components/providers/user-data-provider"

import { DocumentsTable } from "@/components/knowledge/documents-table"
import { UploadDialog } from "@/components/knowledge/upload-dialog"
import { NoteEditorDialog } from "@/components/knowledge/note-editor-dialog"
import { FileEditorDialog } from "@/components/knowledge/file-editor-dialog"
import { TableEditorDialog } from "@/components/knowledge/table-editor-dialog"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import type { Document } from "@/mocks/documents"

// Helper to format bytes
function formatBytes(bytes: number) {
    if (!bytes) return '-'
    if (bytes < 1024) return `${bytes} B`
    else if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    else return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// Convert LibraryItem from DB to Document for UI
function libraryItemToDocument(item: LibraryItemWithChunks): Document {
    // Determine type from mimeType or item type
    let docType: Document['type'] = 'txt'
    if (item.type?.toUpperCase() === 'NOTE') {
        docType = 'note'
    } else if (item.mimeType) {
        if (item.mimeType.includes('pdf')) docType = 'pdf'
        else if (item.mimeType.includes('word') || item.mimeType.includes('docx')) docType = 'docx'
        else if (item.mimeType.includes('sheet') || item.mimeType.includes('excel') || item.mimeType.includes('xlsx')) docType = 'spreadsheet'
        else if (item.mimeType.includes('markdown')) docType = 'md'
        else if (item.mimeType.includes('text')) docType = 'txt'
    }

    const size = item.fileSize ? formatBytes(item.fileSize) : (item.content?.length ? formatBytes(item.content.length) : '-')

    // Format date
    const now = new Date()
    const created = new Date(item.createdAt)
    const diffMs = now.getTime() - created.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    let updatedAt = 'Только что'
    if (diffDays > 0) updatedAt = `${diffDays} дн. назад`
    else if (diffHours > 0) updatedAt = `${diffHours} ч. назад`

    return {
        id: item.id,
        name: item.name,
        type: docType,
        size,
        chunksCount: item._count.chunks,
        tokensUsage: item._count.chunks * 500, // Approximate
        status: item._count.chunks > 0 ? 'ready' : 'processing',
        updatedAt,
        parentId: null, // No folder structure in current schema
        content: item.content || undefined,
        aiMetadata: (item.aiMetadata as Document['aiMetadata']) || null
    }
}

export function GlobalKnowledgeView({ initialItems = [] }: { initialItems?: LibraryItemWithChunks[] }) {
    const t = useTranslations('Knowledge');

    // Real data from database
    const [documents, setDocuments] = React.useState<Document[]>(
        initialItems.length > 0 ? initialItems.map(libraryItemToDocument) : []
    )

    // Folder Switcher State
    const { agents } = useUserData()
    const [selectedSpace, setSelectedSpace] = React.useState<string>('global')

    // Sync state with server props when they change (e.g. after revalidatePath)
    React.useEffect(() => {
        setDocuments(initialItems.length > 0 ? initialItems.map(libraryItemToDocument) : [])
    }, [initialItems])

    const [isLoading, setIsLoading] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)
    const [searchQuery, setSearchQuery] = React.useState("")

    // Drag & Drop State
    const [isDraggingGlobal, setIsDraggingGlobal] = React.useState(false)
    const [droppedFiles, setDroppedFiles] = React.useState<File[]>([])
    const [isUploadDialogOpen, setIsUploadDialogOpen] = React.useState(false)
    const [isNoteDialogOpen, setIsNoteDialogOpen] = React.useState(false)
    const [selectedNote, setSelectedNote] = React.useState<Document | null>(null)

    // Load documents function (loads all data once, search is client-side)
    const loadDocuments = React.useCallback(async () => {
        try {
            setIsLoading(true)
            const items = await getLibraryItems()
            const docs = items.map(libraryItemToDocument)
            setDocuments(docs)
        } catch (err) {
            console.error('Failed to load documents:', err)
            setError('Не удалось загрузить документы')
            setDocuments([])
        } finally {
            setIsLoading(false)
        }
    }, [])

    // Load documents on mount
    React.useEffect(() => {
        loadDocuments()
    }, [loadDocuments])

    const [editingFile, setEditingFile] = React.useState<any>(null)
    const [editingTable, setEditingTable] = React.useState<any>(null)
    const [isCreateOpen, setIsCreateOpen] = React.useState(false)
    const [isCreateSpaceOpen, setIsCreateSpaceOpen] = React.useState(false)
    const [newSpaceEmoji, setNewSpaceEmoji] = React.useState("📁")

    const handleCreateNote = async (noteData: { title: string, content: string }) => {
        try {
            const result = await createLibraryItem({
                name: noteData.title,
                type: 'NOTE',
                content: noteData.content,
                chunks: [{
                    content: noteData.content,
                    index: 0,
                    metadata: { type: 'note_segment' }
                }]
            })

            if (result.success && result.item) {
                // Manually construct the Document object to avoid type issues with _count
                const createdItem = result.item
                const newItemForUI: Document = {
                    id: createdItem.id,
                    name: createdItem.name,
                    type: 'note',
                    size: '-',
                    chunksCount: 1,
                    tokensUsage: 0,
                    status: 'ready',
                    updatedAt: 'Только что',
                    parentId: null,
                    content: createdItem.content || undefined
                }

                setDocuments(prev => [...prev, newItemForUI])
                setIsNoteDialogOpen(false)
                toast.success("Заметка успешно создана")
            } else {
                toast.error(result.error || "Ошибка при создании заметки")
            }
        } catch (error) {
            console.error("Failed to create note:", error)
            toast.error("Ошибка при создании заметки")
        }
    }



    const handleUpdateNote = async (noteData: { id: string, title: string, content: string }) => {
        try {
            const result = await updateLibraryItem(noteData.id, {
                name: noteData.title,
                content: noteData.content
            })

            if (result.success && result.item) {
                // Update local state
                setDocuments(prev => prev.map(doc => {
                    if (doc.id === noteData.id) {
                        return {
                            ...doc,
                            name: noteData.title,
                            content: noteData.content,
                            // Update size approx
                            size: formatBytes(noteData.content.length)
                        }
                    }
                    return doc
                }))

                setIsNoteDialogOpen(false)
                setSelectedNote(null)
                toast.success("Заметка обновлена")
            } else {
                toast.error("Не удалось обновить заметку")
            }
        } catch (e) {
            console.error(e)
            toast.error("Ошибка при обновлении")
        }
    }

    const handleDeleteNote = async (id: string) => {
        try {
            await deleteLibraryItem(id)
            setDocuments(prev => prev.filter(doc => doc.id !== id))
            setIsNoteDialogOpen(false)
            setSelectedNote(null)
            toast.success("Заметка удалена")
        } catch (error) {
            toast.error("Ошибка удаления")
        }
    }

    const handleDelete = async (id: string) => {
        try {
            await deleteLibraryItem(id)
            setDocuments(documents.filter(d => d.id !== id))
        } catch (err) {
            console.error('Failed to delete:', err)
        }
    }

    const [currentFolderId, setCurrentFolderId] = React.useState<string | null>(null)
    const [filterType, setFilterType] = React.useState<'all' | 'document' | 'image' | 'note'>('all')

    // Filter documents based on current folder
    const currentDocuments = documents.filter(doc => doc.parentId === currentFolderId)
    const currentFolder = documents.find(d => d.id === currentFolderId)

    // Separate notes from other documents
    const notes = currentDocuments.filter(doc => doc.type === 'note')
    const nonNoteDocuments = currentDocuments.filter(doc => doc.type !== 'note')

    // Apply search filter to non-note documents only (client-side, by name only)
    const searchFilteredDocuments = searchQuery.trim()
        ? nonNoteDocuments.filter(doc =>
            doc.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : nonNoteDocuments

    // Apply type filter (excluding notes since they're shown separately)
    const filteredDocuments = searchFilteredDocuments.filter(doc => {
        if (filterType === 'all') return true
        if (filterType === 'document') return ['pdf', 'docx', 'txt', 'md'].includes(doc.type)
        if (filterType === 'image') return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(doc.type)
        if (filterType === 'note') return doc.type === 'note'
        return true
    })

    const handleFileClick = (doc: Document) => {
        if (doc.type === 'folder') {
            setCurrentFolderId(doc.id)
            return
        }

        if (doc.type === 'note') {
            setSelectedNote(doc)
            setIsNoteDialogOpen(true)
        } else if (doc.type === 'spreadsheet') {
            setEditingTable(doc)
        } else {
            setEditingFile(doc)
        }
    }

    const handleBack = () => {
        setCurrentFolderId(null)
    }

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

    // Global Drag & Drop Handlers
    const handleGlobalDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        if (!isDraggingGlobal) setIsDraggingGlobal(true)
    }

    const handleGlobalDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        // Simple check to avoid flickering when dragging over child elements
        if (e.currentTarget.contains(e.relatedTarget as Node)) return
        setIsDraggingGlobal(false)
    }

    const handleGlobalDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDraggingGlobal(false)

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const files = Array.from(e.dataTransfer.files)
            setDroppedFiles(files)
            setIsUploadDialogOpen(true)
        }
    }

    const notesCount = notes.length;
    const filesCount = nonNoteDocuments.length;

    // Render Agent View if selected
    if (selectedSpace !== 'global') {
        return (
            <div className="flex flex-col h-full bg-background relative">
                <div className="flex-none px-6 pt-6 pb-0 z-10 w-full">
                    <div className="flex items-center gap-2">
                        <FolderSelector
                            value={selectedSpace}
                            onValueChange={setSelectedSpace}
                            agents={agents}
                        />
                    </div>
                </div>
                <div className="flex-1 min-h-0">
                    <AgentKnowledgeView agentId={selectedSpace} />
                </div>
            </div>
        )
    }

    return (
        <div
            className="flex flex-1 flex-col gap-6 p-6 relative"
            onDragOver={handleGlobalDragOver}
            onDragLeave={handleGlobalDragLeave}
            onDrop={handleGlobalDrop}
        >
            {/* Drag Overlay - Minimalistic */}
            {isDraggingGlobal && (
                <div className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-sm flex items-center justify-center pointer-events-none transition-all duration-300">
                    <div className="bg-white/90 backdrop-blur-md p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-200 border border-white/20">
                        <div className="p-5 rounded-full bg-zinc-900/5 shadow-inner">
                            <UploadCloud className="h-10 w-10 text-zinc-900 animate-bounce" />
                        </div>
                        <div className="text-center space-y-1">
                            <h3 className="text-xl font-bold text-zinc-900 tracking-tight">Отпустите файлы</h3>
                            <p className="text-zinc-500 font-medium">для добавления в базу знаний</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Dialogs */}
            <UploadDialog
                open={isUploadDialogOpen}
                onOpenChange={setIsUploadDialogOpen}
                externalFiles={droppedFiles}
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
                onSave={selectedNote ? handleUpdateNote : handleCreateNote}
                onDelete={selectedNote ? () => handleDeleteNote(selectedNote.id) : undefined}
            />

            <FileEditorDialog
                open={!!editingFile}
                onOpenChange={(open) => !open && setEditingFile(null)}
                file={editingFile}
                onSave={(id, content) => {
                    console.log(`Saving content for file ${id}:`, content)
                    setEditingFile(null)
                }}
            />

            <TableEditorDialog
                open={!!editingTable}
                onOpenChange={(open) => !open && setEditingTable(null)}
                file={editingTable}
                onSave={(id, data) => {
                    console.log(`Saving table for file ${id}:`, data)
                    setEditingTable(null)
                }}
            />

            {/* Header Section */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">База знаний</h1>
                        <p className="text-sm text-muted-foreground">
                            {filesCount} Файлов <span className="text-zinc-300">•</span> {notesCount} Заметок
                        </p>
                    </div>
                </div>
                <div>
                    <FolderSelector
                        value={selectedSpace}
                        onValueChange={setSelectedSpace}
                        agents={agents}
                    />
                </div>
            </div>

            <div className="flex items-center justify-between gap-4">
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Все ресурсы</h3>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Input
                            placeholder="Поиск файлов..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-9 w-[240px] rounded-xl border-transparent bg-zinc-100/50 focus:bg-white focus:ring-2 focus:ring-zinc-200 transition-all font-medium text-zinc-900 pl-3 shadow-none placeholder:text-zinc-400"
                        />
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className={cn(
                                "h-9 rounded-xl border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 hover:border-zinc-300 shadow-sm",
                                filterType !== 'all' && "border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-800 hover:border-zinc-800 hover:text-white"
                            )}>
                                <Filter className="h-4 w-4 mr-2" />
                                {filterType === 'all' ? 'Все типы' :
                                    filterType === 'document' ? 'Документы' :
                                        filterType === 'image' ? 'Изображения' :
                                            filterType === 'note' ? 'Заметки' : 'Все типы'}
                                <ChevronDown className="h-4 w-4 ml-2" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 p-1 rounded-xl shadow-xl border-zinc-100">
                            <DropdownMenuLabel className="text-xs font-medium text-zinc-400 px-3 py-2 uppercase tracking-wider">
                                Тип контента
                            </DropdownMenuLabel>
                            <DropdownMenuItem
                                onClick={() => setFilterType('all')}
                                className={cn("rounded-lg py-2.5 px-3 cursor-pointer", filterType === 'all' && "bg-zinc-100")}
                            >
                                <div className="flex items-center gap-3 w-full">
                                    <Filter className="h-4 w-4 text-zinc-500" />
                                    <span className="font-medium">Все типы</span>
                                    {filterType === 'all' && <Check className="h-4 w-4 ml-auto text-zinc-900" />}
                                </div>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => setFilterType('document')}
                                className={cn("rounded-lg py-2.5 px-3 cursor-pointer", filterType === 'document' && "bg-zinc-100")}
                            >
                                <div className="flex items-center gap-3 w-full">
                                    <FileText className="h-4 w-4 text-blue-500" />
                                    <span className="font-medium">Документы</span>
                                    {filterType === 'document' && <Check className="h-4 w-4 ml-auto text-zinc-900" />}
                                </div>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => setFilterType('image')}
                                className={cn("rounded-lg py-2.5 px-3 cursor-pointer", filterType === 'image' && "bg-zinc-100")}
                            >
                                <div className="flex items-center gap-3 w-full">
                                    <Image className="h-4 w-4 text-purple-500" />
                                    <span className="font-medium">Изображения</span>
                                    {filterType === 'image' && <Check className="h-4 w-4 ml-auto text-zinc-900" />}
                                </div>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
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
                            <DropdownMenuItem onClick={() => { setIsUploadDialogOpen(true) }} className="rounded-lg py-2.5 px-3 cursor-pointer hover:bg-zinc-50 focus:bg-zinc-50 focus:text-zinc-900">
                                <div className="p-1.5 rounded-md bg-zinc-100 mr-3 text-zinc-500 group-hover:text-zinc-900 transition-colors">
                                    <UploadCloud className="h-4 w-4" />
                                </div>
                                <span className="font-medium">Загрузить файлы</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setSelectedNote(null); setIsNoteDialogOpen(true) }} className="rounded-lg py-2.5 px-3 cursor-pointer hover:bg-amber-50 focus:bg-amber-50 focus:text-amber-900">
                                <div className="p-1.5 rounded-md bg-amber-100 mr-3 text-amber-600">
                                    <Sparkles className="h-4 w-4" />
                                </div>
                                <span className="font-medium text-amber-900">Создать заметку</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="my-1 bg-zinc-100" />
                            <DropdownMenuItem
                                onClick={async () => {
                                    if (confirm('Вы уверены? Это удалит ВСЕ файлы и заметки.')) {
                                        await clearLibrary();
                                        toast.success('База данных очищена');
                                    }
                                }}
                                className="rounded-lg py-2.5 px-3 cursor-pointer hover:bg-red-50 focus:bg-red-50 focus:text-red-900"
                            >
                                <div className="p-1.5 rounded-md bg-red-100 mr-3 text-red-600">
                                    <Trash2 className="h-4 w-4" />
                                </div>
                                <span className="font-medium text-red-900">Очистить базу</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled className="rounded-lg py-2.5 px-3 opacity-50 cursor-not-allowed">
                                <div className="p-1.5 rounded-md bg-zinc-100 mr-3">
                                    <Zap className="h-4 w-4 text-zinc-400" />
                                </div>
                                <span>Подключить таблицу</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Content Area */}
            <div className="space-y-8">
                {/* Important Notes Section */}
                {notes.length > 0 && (
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                            <Sparkles className="h-4 w-4" /> Важные заметки (Высокий приоритет)
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {notes.map((note) => (
                                <Card
                                    key={note.id}
                                    className="rounded-2xl border-zinc-200/50 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:border-zinc-300 transition-colors cursor-pointer"
                                    onClick={() => { setSelectedNote(note); setIsNoteDialogOpen(true) }}
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

                {/* Files Table */}
                <div className="pb-10">
                    <DocumentsTable
                        docs={filteredDocuments}
                        onRowClick={handleFileClick}
                        onDelete={(doc) => handleDelete(doc.id)}
                    />
                </div>
            </div>
        </div>
    )
}
