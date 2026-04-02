"use client"

import * as React from "react"
import { UploadCloud, Check } from "lucide-react"
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
    agentId?: string  // If provided, upload to agent instead of library
    onUploadComplete?: () => void  // Callback after successful upload
}

export function UploadDialog({ trigger, open: controlledOpen, onOpenChange: setControlledOpen, externalFiles, agentId, onUploadComplete }: UploadDialogProps) {
    const [internalOpen, setInternalOpen] = React.useState(false)
    const isControlled = controlledOpen !== undefined
    const open = isControlled ? controlledOpen : internalOpen
    const setOpen = isControlled ? setControlledOpen! : setInternalOpen

    const [isDragging, setIsDragging] = React.useState(false)
    const [isUploaded, setIsUploaded] = React.useState(false)
    const [isProcessing, setIsProcessing] = React.useState(false)
    const [progress, setProgress] = React.useState(0)
    const [activeTab, setActiveTab] = React.useState("files")
    const [websiteUrl, setWebsiteUrl] = React.useState("")
    const fileInputRef = React.useRef<HTMLInputElement>(null)

    // Track processed files to prevent duplicates
    const processedFilesRef = React.useRef<Set<string>>(new Set())

    // Handle external files (drag & drop from parent)
    React.useEffect(() => {
        if (externalFiles && externalFiles.length > 0) {
            // Filter out already processed files
            const newFiles = externalFiles.filter(f => !processedFilesRef.current.has(f.name + f.size))
            if (newFiles.length > 0) {
                newFiles.forEach(f => processedFilesRef.current.add(f.name + f.size))
                handleFiles(newFiles)
            }
        }
    }, [externalFiles])

    const processFile = async (file: File) => {
        // Send file directly to server action — parsing happens server-side
        if (agentId) {
            try {
                const formData = new FormData()
                formData.append('file', file)

                const { uploadAgentDocument } = await import('@/actions/agent-knowledge')
                const result = await uploadAgentDocument({ agentId, file: formData })

                if (!result.success) {
                    if (result.error?.includes('Недостаточно PU')) {
                        toast.error("Недостаточно PU баланса", {
                            description: "Пожалуйста, пополните баланс перед загрузкой файлов."
                        })
                    } else {
                        toast.error(`Ошибка загрузки: ${result.error}`)
                    }
                    throw new Error(result.error)
                }

                toast.info(`Файл загружен`, {
                    description: `Обработка "${file.name}" запущена в фоне...`
                })

            } catch (err) {
                throw err
            }
        } else {
            // Global library upload
            try {
                const formData = new FormData()
                formData.append('file', file)

                const { uploadLibraryDocument } = await import('@/actions/library')
                const result = await uploadLibraryDocument({ file: formData })

                if (!result.success) {
                    if (result.error?.includes('Недостаточно PU')) {
                        toast.error("Недостаточно PU баланса", {
                            description: "Пожалуйста, пополните баланс перед загрузкой файлов."
                        })
                    } else {
                        toast.error(`Ошибка загрузки: ${result.error}`)
                    }
                    throw new Error(result.error)
                }

                toast.info(`Файл добавлен`, {
                    description: `"${file.name}" обрабатывается в фоне...`
                })

            } catch (err) {
                throw err
            }
        }
    }

    const ALLOWED_EXTENSIONS = new Set([
        'pdf','doc','docx','xls','xlsx','csv','json','html','htm',
        'pptx','ppt','txt','md','png','jpg','jpeg','webp','bmp','tiff','gif'
    ])

    const BLOCKED_EXTENSIONS = new Set(['zip','rar','7z','tar','gz','bz2'])

    // Guard against double-processing (externalFiles effect + handleDrop can both fire)
    const isUploadingRef = React.useRef(false)

    const handleFiles = async (files: File[]) => {
        if (isUploadingRef.current) return
        isUploadingRef.current = true

        // Block archive files explicitly
        const archives = files.filter(f => {
            const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
            return BLOCKED_EXTENSIONS.has(ext)
        })
        if (archives.length > 0) {
            toast.error(`Архивы не поддерживаются (${archives.map(f => f.name).join(', ')})`, {
                description: 'Распакуйте архив и загрузите файлы по отдельности'
            })
        }

        // Filter unsupported files before uploading
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
            setOpen(false)
            isUploadingRef.current = false
            return
        }

        // Close dialog immediately, upload in background
        setOpen(false)
        toast.info(`Загрузка ${valid.length} файл(ов)...`)

        try {
            for (const file of valid) {
                await processFile(file)
            }
            toast.success("Файлы загружены, обработка идёт в фоне")
            onUploadComplete?.()
        } catch (error) {
            console.error("Upload failed:", error)
            if (error instanceof Error && (error.message.includes('Недостаточно PU'))) {
                return
            }
            toast.error("Не удалось загрузить некоторые файлы")
        } finally {
            isUploadingRef.current = false
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
        }
    }

    React.useEffect(() => {
        if (!open) {
            // Reset state after dialog closes (animation delay)
            const timer = setTimeout(() => {
                setIsUploaded(false)
                setIsProcessing(false)
                setProgress(0)
                processedFilesRef.current.clear()
                isUploadingRef.current = false
            }, 300)
            return () => clearTimeout(timer)
        }
        // Force reset when opened manually
        if (open && (!externalFiles || externalFiles.length === 0)) {
            setIsUploaded(false)
            setActiveTab("files")
            setWebsiteUrl("")
            processedFilesRef.current.clear()
        }
    }, [open, externalFiles])

    const handleScrape = async () => {
        if (!websiteUrl) return

        setIsProcessing(true)
        setProgress(10)

        try {
            if (agentId) {
                // Async scraping for agents
                const { asyncScrapeAgentWebsite } = await import('@/actions/agent-knowledge')
                const result = await asyncScrapeAgentWebsite(agentId, websiteUrl)

                if (result.success) {
                    toast.info(`Скрапинг запущен`, {
                        description: `Сайт будет добавлен в базу в фоновом режиме...`
                    })
                    setIsProcessing(false)
                    setOpen(false)
                    onUploadComplete?.()
                    return
                } else {
                    throw new Error(result.error)
                }
            }

            // Async scraping for global library
            const { asyncScrapeLibraryWebsite } = await import('@/actions/library')
            const libResult = await asyncScrapeLibraryWebsite(websiteUrl)

            if (libResult.success) {
                toast.info(`Скрапинг запущен`, {
                    description: `Сайт будет добавлен в библиотеку в фоновом режиме...`
                })
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

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                {isProcessing ? (
                    <div className="flex flex-col items-center justify-center py-10 space-y-4">
                        <UploadCloud className="h-12 w-12 text-primary animate-pulse" />
                        <div className="text-center space-y-1 w-full max-w-xs">
                            <h3 className="font-semibold text-lg">Обработка файлов...</h3>
                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">{progress}% завершено</p>
                        </div>
                    </div>
                ) : !isUploaded ? (
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
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
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
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleScrape()
                                            }}
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
                ) : (
                    <>
                        <div className="flex flex-col items-center justify-center py-10 space-y-4">
                            <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                                <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
                            </div>
                            <div className="text-center space-y-1">
                                <h3 className="font-semibold text-lg">Файлы загружены!</h3>
                                <p className="text-sm text-muted-foreground">
                                    Система уже обрабатывает и индексирует документы.
                                </p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={() => setOpen(false)} className="w-full">
                                Готово
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}
