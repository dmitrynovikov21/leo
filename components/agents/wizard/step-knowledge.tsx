"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { FileText, Plus, Trash2, UploadCloud, Loader2, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { WizardData } from "./wizard-layout"

interface StepKnowledgeProps {
    agentId: string
    data: WizardData["step2"]
    onChange: (data: Partial<NonNullable<WizardData["step2"]>>) => void
}

export function StepKnowledge({ agentId, data, onChange }: StepKnowledgeProps) {
    const [uploading, setUploading] = React.useState(false)
    const [uploadedFiles, setUploadedFiles] = React.useState<{ name: string; status: string }[]>(
        () => (data?.files || []).map(name => ({ name, status: "done" }))
    )
    const fileInputRef = React.useRef<HTMLInputElement>(null)

    const faq = data?.manualFaq || []

    const handleFileUpload = async (files: FileList | null) => {
        if (!files || files.length === 0) return

        setUploading(true)
        const fileNames: string[] = [...(data?.files || [])]

        for (const file of Array.from(files)) {
            setUploadedFiles(prev => [...prev, { name: file.name, status: "uploading" }])
            try {
                const formData = new FormData()
                formData.append("file", file)

                const { uploadAgentDocument } = await import("@/actions/agent-knowledge")
                const result = await uploadAgentDocument({ agentId, file: formData })

                if (result.success) {
                    fileNames.push(file.name)
                    setUploadedFiles(prev =>
                        prev.map(f => f.name === file.name ? { ...f, status: "done" } : f)
                    )
                    toast.info(`"${file.name}" обрабатывается в фоне`)
                } else {
                    setUploadedFiles(prev =>
                        prev.map(f => f.name === file.name ? { ...f, status: "error" } : f)
                    )
                    toast.error(`Ошибка: ${result.error}`)
                }
            } catch {
                setUploadedFiles(prev =>
                    prev.map(f => f.name === file.name ? { ...f, status: "error" } : f)
                )
            }
        }

        onChange({ files: fileNames })
        setUploading(false)
    }

    const addFaqRow = () => {
        onChange({ manualFaq: [...faq, { question: "", answer: "" }] })
    }

    const updateFaq = (index: number, field: "question" | "answer", value: string) => {
        const updated = [...faq]
        updated[index] = { ...updated[index], [field]: value }
        onChange({ manualFaq: updated })
    }

    const removeFaq = (index: number) => {
        onChange({ manualFaq: faq.filter((_, i) => i !== index) })
    }

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-xl font-bold">База знаний</h3>
                <p className="text-sm text-muted-foreground mt-1">
                    Загрузите файлы или добавьте частые вопросы — агент будет использовать их для ответов
                </p>
            </div>

            {/* File upload */}
            <div className="space-y-3">
                <Label>Загрузите файлы с информацией о вашем бизнесе</Label>
                <div
                    className={cn(
                        "border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/30",
                        uploading && "opacity-60 pointer-events-none"
                    )}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
                    onDrop={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleFileUpload(e.dataTransfer.files)
                    }}
                >
                    <UploadCloud className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                        Перетащите файлы сюда или нажмите для выбора
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                        PDF, DOC, DOCX, TXT, XLS, XLSX
                    </p>
                    <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        multiple
                        accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.csv,.md,.json"
                        onChange={(e) => handleFileUpload(e.target.files)}
                    />
                </div>

                {/* Uploaded files list */}
                {uploadedFiles.length > 0 && (
                    <div className="space-y-2">
                        {uploadedFiles.map((f, i) => (
                            <div key={i} className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
                                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <span className="flex-1 truncate">{f.name}</span>
                                {f.status === "uploading" && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                                {f.status === "done" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                                {f.status === "error" && <span className="text-xs text-red-500">Ошибка</span>}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Manual FAQ */}
            <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                    <Label className="text-foreground font-medium">Или добавьте частые вопросы вручную</Label>
                    <Button variant="outline" size="sm" className="rounded-xl" onClick={addFaqRow}>
                        <Plus className="h-4 w-4 mr-1" /> Добавить вопрос
                    </Button>
                </div>
                {faq.length > 0 && (
                    <div className="space-y-3">
                        {faq.map((item, i) => (
                            <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-start">
                                <Input
                                    placeholder="Вопрос"
                                    value={item.question}
                                    onChange={(e) => updateFaq(i, "question", e.target.value)}
                                />
                                <Input
                                    placeholder="Ответ"
                                    value={item.answer}
                                    onChange={(e) => updateFaq(i, "answer", e.target.value)}
                                />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeFaq(i)}
                                    className="text-muted-foreground hover:text-red-500"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
