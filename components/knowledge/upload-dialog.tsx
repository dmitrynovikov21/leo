"use client"

import * as React from "react"
import { UploadCloud, Check, Loader2, AlertCircle, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

import { toast } from "sonner"

interface UploadDialogProps {
    trigger?: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
    externalFiles?: File[]
    agentId?: string
    onUploadComplete?: () => void
}

interface FileStatus {
    name: string
    status: 'pending' | 'uploading' | 'done' | 'error'
    error?: string
}

export function UploadDialog({ trigger, open: controlledOpen, onOpenChange: setControlledOpen, externalFiles, agentId, onUploadComplete }: UploadDialogProps) {
    const [internalOpen, setInternalOpen] = React.useState(false)
    const isControlled = controlledOpen !== undefined
    const open = isControlled ? controlledOpen : internalOpen
    const setOpen = isControlled ? setControlledOpen! : setInternalOpen

    const [isDragging, setIsDragging] = React.useState(false)
    const [activeTab, setActiveTab] = React.useState("files")
    const [websiteUrl, setWebsiteUrl] = React.useState("")
    const [isProcessing, setIsProcessing] = React.useState(false)
    const [progress, setProgress] = React.useState(0)
    const fileInputRef = React.useRef<HTMLInputElement>(null)

    // Upload state
    const [fileStatuses, setFileStatuses] = React.useState<FileStatus[]>([])
    const [isUploading, setIsUploading] = React.useState(false)
    const isUploadingRef = React.useRef(false)
    const processedFilesRef = React.useRef<Set<string>>(new Set())

    const ALLOWED_EXTENSIONS = new Set([
        'pdf','doc','docx','xls','xlsx','csv','json','html','htm',
        'pptx','ppt','txt','md','png','jpg','jpeg','webp','bmp','tiff','gif'
    ])

    const BLOCKED_EXTENSIONS = new Set(['zip','rar','7z','tar','gz','bz2'])

    // Handle external files (drag & drop from parent)
    React.useEffect(() => {
        if (externalFiles && externalFiles.length > 0) {
            const newFiles = externalFiles.filter(f => !processedFilesRef.current.has(f.name + f.size))
            if (newFiles.length > 0) {
                newFiles.forEach(f => processedFilesRef.current.add(f.name + f.size))
                handleFiles(newFiles)
            }
        }
    }, [externalFiles])

    const processFile = async (file: File) => {
        if (agentId) {
            const formData = new FormData()
            formData.append('file', file)
            const { uploadAgentDocument } = await import('@/actions/agent-knowledge')
            const result = await uploadAgentDocument({ agentId, file: formData })
            if (!result.success) throw new Error(result.error)
        } else {
            const formData = new FormData()
            formData.append('file', file)
            const { uploadLibraryDocument } = await import('@/actions/library')
            const result = await uploadLibraryDocument({ file: formData })
            if (!result.success) throw new Error(result.error)
        }
    }

    const handleFiles = async (files: File[]) => {
        if (isUploadingRef.current) return
        isUploadingRef.current = true
        setIsUploading(true)

        // Block archives
        const archives = files.filter(f => {
            const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
            return BLOCKED_EXTENSIONS.has(ext)
        })
        if (archives.length > 0) {
            toast.error(`Архивы не поддерживаются (${archives.map(f => f.name).join(', ')})`, {
                description: 'Распакуйте архив и загрузите файлы по отдельности'
            })
        }

        // Filter valid
        const valid = files.filter(f => {
            const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
            return ALLOWED_EXTENSIONS.has(ext) && !BLOCKED_EXTENSIONS.has(ext)
        })
        const invalid = files.length - valid.length - archives.length
        if (invalid > 0) {
            toast.error(`${invalid} файл(ов) не поддерживается`, {
                description: 'Поддерживаются: PDF, Word, Excel, CSV, JSON, HTML, PPTX, TXT, MD, изображения'
            })
        }
        if (valid.length === 0) {
            isUploadingRef.current = false
            setIsUploading(false)
            return
        }

        // Initialize file statuses
        setFileStatuses(valid.map(f => ({ name: f.name, status: 'pending' })))

        // Upload one by one with status updates
        let hasErrors = false
        for (let i = 0; i < valid.length; i++) {
            const file = valid[i]
            setFileStatuses(prev => prev.map((s, idx) => idx === i ? { ...s, status: 'uploading' } : s))

            try {
                await processFile(file)
                setFileStatuses(prev => prev.map((s, idx) => idx === i ? { ...s, status: 'done' } : s))
            } catch (error) {
                hasErrors = true
                const errMsg = error instanceof Error ? error.message : 'Ошибка'
                setFileStatuses(prev => prev.map((s, idx) => idx === i ? { ...s, status: 'error', error: errMsg } : s))
            }
        }

        isUploadingRef.current = false
        setIsUploading(false)
        onUploadComplete?.()
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFiles(Array.from(e.dataTransfer.files))
        }
    }

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFiles(Array.from(e.target.files))
            // Reset input so same file can be selected again
            e.target.value = ''
        }
    }

    // Reset on close
    React.useEffect(() => {
        if (!open) {
            const timer = setTimeout(() => {
                setFileStatuses([])
                setIsUploading(false)
                setIsProcessing(false)
                setProgress(0)
                processedFilesRef.current.clear()
                isUploadingRef.current = false
            }, 300)
            return () => clearTimeout(timer)
        }
        if (open && (!externalFiles || externalFiles.length === 0)) {
            setActiveTab("files")
            setWebsiteUrl("")
            setFileStatuses([])
            processedFilesRef.current.clear()
        }
    }, [open, externalFiles])

    const handleScrape = async () => {
        if (!websiteUrl) return

        setIsProcessing(true)
        setProgress(10)

        try {
            if (agentId) {
                const { asyncScrapeAgentWebsite } = await import('@/actions/agent-knowledge')
                const result = await asyncScrapeAgentWebsite(agentId, websiteUrl)
                if (result.success) {
                    toast.info(`Скрапинг запущен`, { description: `Сайт будет добавлен в базу в фоновом режиме...` })
                    setIsProcessing(false)
                    setOpen(false)
                    onUploadComplete?.()
                    return
                } else {
                    throw new Error(result.error)
                }
            }

            const { asyncScrapeLibraryWebsite } = await import('@/actions/library')
            const libResult = await asyncScrapeLibraryWebsite(websiteUrl)
            if (libResult.success) {
                toast.info(`Скрапинг запущен`, { description: `Сайт будет добавлен в библиотеку в фоновом режиме...` })
                setIsProcessing(false)
                setOpen(false)
                onUploadComplete?.()
                return
            } else {
                throw new Error(libResult.error)
            }
        } catch (error) {
            console.error("Scrape failed:", error)
            toast.error(error instanceof Error ? error.message : "Не удалось получить контент, попробуйте еще раз")
            setIsProcessing(false)
        }
    }

    const allDone = fileStatuses.length > 0 && fileStatuses.every(s => s.status === 'done' || s.status === 'error')
    const doneCount = fileStatuses.filter(s => s.status === 'done').length
    const errorCount = fileStatuses.filter(s => s.status === 'error').length

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!isUploading) setOpen(v) }}>
            <DialogTrigger asChild>
                {trigger}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                {isProcessing ? (
                    <div className="flex flex-col items-center justify-center py-10 space-y-4">
                        <UploadCloud className="h-12 w-12 text-primary animate-pulse" />
                        <div className="text-center space-y-1 w-full max-w-xs">
                            <h3 className="font-semibold text-lg">Обработка...</h3>
                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
                            </div>
                            <p className="text-xs text-muted-foreground">{progress}% завершено</p>
                        </div>
                    </div>
                ) : fileStatuses.length > 0 ? (
                    <>
                        <DialogHeader>
                            <DialogTitle>
                                {allDone
                                    ? `Загрузка завершена`
                                    : `Загрузка файлов...`
                                }
                            </DialogTitle>
                            <DialogDescription>
                                {allDone
                                    ? `${doneCount} загружено${errorCount > 0 ? `, ${errorCount} с ошибкой` : ''}`
                                    : `${doneCount} из ${fileStatuses.length} файлов`
                                }
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                            {fileStatuses.map((f, i) => (
                                <div key={i} className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
                                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    <span className="flex-1 truncate">{f.name}</span>
                                    {f.status === 'pending' && <span className="text-xs text-muted-foreground">Ожидание</span>}
                                    {f.status === 'uploading' && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
                                    {f.status === 'done' && <Check className="h-3.5 w-3.5 text-emerald-500" />}
                                    {f.status === 'error' && (
                                        <span className="flex items-center gap-1 text-xs text-red-500">
                                            <AlertCircle className="h-3.5 w-3.5" />
                                            Ошибка
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>

                        {allDone && (
                            <DialogFooter>
                                <Button onClick={() => setOpen(false)} className="w-full">
                                    Готово
                                </Button>
                            </DialogFooter>
                        )}
                    </>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle>Загрузка знаний</DialogTitle>
                            <DialogDescription>
                                Поддерживаются: PDF, Word, Excel, CSV, JSON, HTML, PPTX, TXT, MD, Изображения.
                                <br />
                                Лимит размера файла — 50 МБ.
                            </DialogDescription>
                        </DialogHeader>

                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="files">Файлы</TabsTrigger>
                                <TabsTrigger value="website">Веб-сайт</TabsTrigger>
                            </TabsList>

                            <TabsContent value="files" className="mt-4">
                                <div
                                    className={cn(
                                        "border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center gap-4 transition-colors cursor-pointer",
                                        isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
                                    )}
                                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                                    onDragLeave={(e) => { e.preventDefault(); setIsDragging(false) }}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <input
                                        type="file"
                                        className="hidden"
                                        ref={fileInputRef}
                                        onChange={handleFileInput}
                                        multiple
                                        accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.json,.html,.htm,.pptx,.ppt,.txt,.md,.png,.jpg,.jpeg,.webp,.bmp,.tiff,.gif"
                                    />
                                    <div className="p-4 rounded-full bg-muted/50">
                                        <UploadCloud className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                    <div className="text-center space-y-1">
                                        <p className="text-sm font-medium">Перетащите файлы сюда</p>
                                        <p className="text-xs text-muted-foreground">или нажмите для выбора</p>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="website" className="mt-4 space-y-4">
                                <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground">
                                        Введите адрес веб-сайта для скачивания содержимого.
                                    </p>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="https://example.com"
                                            value={websiteUrl}
                                            onChange={(e) => setWebsiteUrl(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') handleScrape() }}
                                        />
                                    </div>
                                </div>
                                <Button
                                    className="w-full"
                                    onClick={handleScrape}
                                    disabled={!websiteUrl || isProcessing}
                                >
                                    <UploadCloud className="mr-2 h-4 w-4" />
                                    Спарсить и добавить
                                </Button>
                            </TabsContent>
                        </Tabs>
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}
