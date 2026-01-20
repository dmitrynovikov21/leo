"use client"

import * as React from "react"
import { UploadCloud, FileText, Check } from "lucide-react"
import { useSession } from "next-auth/react"
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
import { cn } from "@/lib/utils"

import { createLibraryItem } from "@/actions/library"
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
    const { data: session } = useSession()
    const [internalOpen, setInternalOpen] = React.useState(false)
    const isControlled = controlledOpen !== undefined
    const open = isControlled ? controlledOpen : internalOpen
    const setOpen = isControlled ? setControlledOpen! : setInternalOpen

    const [isDragging, setIsDragging] = React.useState(false)
    const [isUploaded, setIsUploaded] = React.useState(false)
    const [isProcessing, setIsProcessing] = React.useState(false)
    const [progress, setProgress] = React.useState(0)
    const fileInputRef = React.useRef<HTMLInputElement>(null)

    // Handle external files (drag & drop from parent)
    React.useEffect(() => {
        if (externalFiles && externalFiles.length > 0) {
            handleFiles(externalFiles)
        }
    }, [externalFiles])

    const processFile = async (file: File) => {
        // Read file content if text/md
        let content = ""
        if (file.type === "text/plain" || file.name.endsWith(".md")) {
            content = await file.text()
        } else {
            content = "File processing pending... Content will be extracted by OCR/Parser worker."
        }

        // If agentId is provided, upload to agent via API
        if (agentId) {
            const gatewayUrl = process.env.NEXT_PUBLIC_AI_GATEWAY_URL
            if (!gatewayUrl) {
                toast.error("AI Gateway URL не настроен")
                return
            }

            // Parse file first
            const formData = new FormData()
            formData.append('file', file)

            const parseResponse = await fetch(`${gatewayUrl}/api/v1/documents/parse`, {
                method: 'POST',
                body: formData,
            })

            if (!parseResponse.ok) throw new Error('Failed to parse document')

            const parseData = await parseResponse.json()
            const chunks = (parseData.chunks || []).map((chunk: any, index: number) => ({
                index,
                text: typeof chunk === 'string' ? chunk : chunk.content || chunk.text || ''
            }))

            // Vectorize and save
            const vectorizeResponse = await fetch(`${gatewayUrl}/api/v1/documents/vectorize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    agentId,
                    userId: session?.user?.id,
                    filename: file.name,
                    fileSize: file.size,
                    mimeType: file.type || 'application/octet-stream',
                    chunks,
                }),
            })

            if (!vectorizeResponse.ok) throw new Error('Failed to vectorize')
        } else {
            // Upload to library
            const chunks = [{
                content: content.slice(0, 500) || "Empty content",
                index: 0,
                metadata: { fileName: file.name }
            }]

            await createLibraryItem({
                name: file.name,
                type: 'FILE',
                content: content,
                fileSize: file.size,
                mimeType: file.type || 'application/octet-stream',
                chunks
            })
        }
    }

    const handleFiles = async (files: File[]) => {
        setIsProcessing(true)
        setProgress(0)

        if (!open) setOpen(true)

        try {
            const totalFiles = files.length
            for (let i = 0; i < totalFiles; i++) {
                await processFile(files[i])
                setProgress(Math.round(((i + 1) / totalFiles) * 100))
            }

            setIsUploaded(true)
            toast.success("Файлы успешно загружены")
            onUploadComplete?.()
        } catch (error) {
            console.error("Upload failed:", error)
            toast.error("Не удалось загрузить некоторые файлы")
        } finally {
            setIsProcessing(false)
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
        if (!open && (!externalFiles || externalFiles.length === 0)) {
            // Reset state after dialog closes (animation delay)
            const timer = setTimeout(() => {
                setIsUploaded(false)
                setIsProcessing(false)
                setProgress(0)
            }, 300)
            return () => clearTimeout(timer)
        }
        // Force reset when opened manually
        if (open && !externalFiles) {
            setIsUploaded(false)
        }
    }, [open, externalFiles])

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
                            <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
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
                                Добавьте документы в базу знаний. Поддерживаются PDF, TXT, DOCX.
                            </DialogDescription>
                        </DialogHeader>
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
                            />
                            <div className="p-4 rounded-full bg-muted/50">
                                <UploadCloud className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <div className="text-center space-y-1">
                                <p className="text-sm font-medium">Перетащите файлы сюда</p>
                                <p className="text-xs text-muted-foreground">или нажмите для выбора</p>
                            </div>
                        </div>
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
