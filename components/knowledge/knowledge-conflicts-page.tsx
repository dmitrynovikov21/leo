"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { AlertTriangle, FileText, Check, EyeOff, ExternalLink, Loader2, RefreshCw, Edit } from "lucide-react"
import { toast } from "sonner"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileEditorDialog } from "@/components/knowledge/file-editor-dialog"
import { ConflictValueEditor } from "@/components/knowledge/conflict-value-editor"
import { updateConflictStatus } from "@/actions/conflicts"

interface ConflictFile {
    file_id: string
    file_name: string
    value_found: string
}

interface KnowledgeConflict {
    id: string
    agentId: string | null
    chatId: string | null
    topic: string
    details: ConflictFile[]
    status: "new" | "resolved" | "ignored"
    detectedAt: string
    resolvedAt: string | null
}

interface KnowledgeConflictsPageProps {
    agentId: string
}

export function KnowledgeConflictsPage({ agentId }: KnowledgeConflictsPageProps) {
    const t = useTranslations("Conflicts")
    const [conflicts, setConflicts] = React.useState<KnowledgeConflict[]>([])
    const [isLoading, setIsLoading] = React.useState(true)
    const [updatingId, setUpdatingId] = React.useState<string | null>(null)
    const [activeTab, setActiveTab] = React.useState("new")
    const [editingFile, setEditingFile] = React.useState<any>(null)
    const [loadingFileId, setLoadingFileId] = React.useState<string | null>(null)

    const [editingFileHighlight, setEditingFileHighlight] = React.useState<string | undefined>(undefined)

    const fetchConflicts = React.useCallback(async () => {
        setIsLoading(true)
        try {
            const params = new URLSearchParams()
            if (agentId) params.set("agentId", agentId)
            if (activeTab !== "all") params.set("status", activeTab) // already lowercase

            const res = await fetch(`/api/v1/conflicts?${params}`)
            if (res.ok) {
                const data = await res.json()
                setConflicts(data.conflicts || [])
            }
        } catch (error) {
            console.error("Failed to fetch conflicts:", error)
        } finally {
            setIsLoading(false)
        }
    }, [agentId, activeTab])

    React.useEffect(() => {
        fetchConflicts()
    }, [fetchConflicts])

    // Filter out Audit conflicts (they are handled in Knowledge Base view)
    const agentConflicts = React.useMemo(() => {
        return conflicts.filter(c => Array.isArray(c.details))
    }, [conflicts])

    const updateStatus = async (id: string, status: "resolved" | "ignored") => {
        setUpdatingId(id)
        try {
            const res = await fetch(`/api/v1/conflicts/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            })

            if (res.ok) {
                setConflicts(prev => prev.filter(c => c.id !== id))
                toast.success(status === "resolved" ? t("conflictResolved") : t("conflictIgnored"))
            } else {
                throw new Error("Failed to update")
            }
        } catch (error) {
            console.error("Failed to update conflict:", error)
            toast.error(t("updateFailed"))
        } finally {
            setUpdatingId(null)
        }
    }

    const handleOpenFile = async (fileId: string, fileName: string, highlightText?: string) => {
        setLoadingFileId(fileId)
        try {
            const gatewayUrl = process.env.NEXT_PUBLIC_AI_GATEWAY_URL
            if (!gatewayUrl) {
                toast.error("Gateway URL not configured")
                return
            }

            const response = await fetch(`${gatewayUrl}/api/v1/agents/${agentId}/documents/${fileId}`)
            if (response.ok) {
                const data = await response.json()
                const chunks = (data.chunks || []).map((c: any, index: number) => ({
                    id: c.id || `chunk-${index}`,
                    content: c.text || c.content || '',
                    chunkIndex: index
                }))

                setEditingFile({
                    id: fileId,
                    name: fileName,
                    chunks,
                    chunksCount: chunks.length,
                    isAgentDocument: true
                })
                setEditingFileHighlight(highlightText)
            } else {
                toast.error("Не удалось загрузить файл")
            }
        } catch (error) {
            console.error("Failed to load file:", error)
            toast.error("Ошибка загрузки файла")
        } finally {
            setLoadingFileId(null)
        }
    }

    const renderConflictCard = (conflict: KnowledgeConflict) => (
        <Card key={conflict.id} className="border border-border shadow-sm">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div>
                        <CardTitle className="text-base font-medium flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            {conflict.topic}
                        </CardTitle>
                        <CardDescription className="text-xs mt-1">
                            {new Date(conflict.detectedAt).toLocaleDateString("ru-RU", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                            })}
                        </CardDescription>
                    </div>
                    <Badge
                        variant="outline"
                        className={
                            conflict.status === "new" ? "bg-amber-50 text-amber-700 border-amber-200" :
                                conflict.status === "resolved" ? "bg-green-50 text-green-700 border-green-200" :
                                    "bg-muted/50 text-muted-foreground border-border"
                        }
                    >
                        {conflict.status === "new" ? t("statusNew") :
                            conflict.status === "resolved" ? t("statusResolved") :
                                t("statusIgnored")}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Conflicting files */}

                <div className="space-y-2">
                    {(Array.isArray(conflict.details) ? conflict.details : []).map((file, idx) => (
                        <div
                            key={file.file_id}
                            className="flex items-start gap-3 bg-muted/50 rounded-lg p-3"
                        >
                            <FileText className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
                            <div className="flex-1 min-w-0 space-y-2">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm text-foreground block truncate">
                                        {file.file_name}
                                    </span>
                                    {file.file_id && (
                                        <button
                                            onClick={() => handleOpenFile(file.file_id, file.file_name, file.value_found)}
                                            disabled={loadingFileId === file.file_id}
                                            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 shrink-0"
                                            title="Редактировать файл полностью"
                                        >
                                            {loadingFileId === file.file_id ? (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            ) : (
                                                <ExternalLink className="h-3.5 w-3.5" />
                                            )}
                                        </button>
                                    )}
                                </div>
                                <div className="relative">
                                    <textarea
                                        readOnly
                                        value={file.value_found}
                                        className="min-h-[60px] w-full max-w-[400px] resize-none rounded-lg border border-border bg-card px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-0"
                                    />
                                </div>
                            </div>
                            {idx < conflict.details.length - 1 && (
                                <div className="self-center px-1">
                                    <span className="text-amber-600 font-bold text-xs bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">VS</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Actions */}
                {
                    conflict.status === "new" && (
                        <div className="flex items-center gap-2 pt-2 border-t">
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-green-700 hover:text-green-800 hover:bg-green-50 border-green-200"
                                onClick={async () => {
                                    setUpdatingId(conflict.id)
                                    try {
                                        const res = await updateConflictStatus(conflict.id, "RESOLVED")
                                        if (res.success) {
                                            setConflicts(prev => prev.filter(c => c.id !== conflict.id))
                                            toast.success("Конфликт разрешен (оставлены оба варианта)")
                                        } else {
                                            toast.error("Ошибка обновления")
                                        }
                                    } finally {
                                        setUpdatingId(null)
                                    }
                                }}
                                disabled={updatingId === conflict.id}
                            >
                                {updatingId === conflict.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <Check className="h-4 w-4 mr-2" />
                                )}
                                Оставить оба
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground hover:text-foreground"
                                onClick={async () => {
                                    setUpdatingId(conflict.id)
                                    try {
                                        const res = await updateConflictStatus(conflict.id, "IGNORED")
                                        if (res.success) {
                                            setConflicts(prev => prev.filter(c => c.id !== conflict.id))
                                            toast.success("Конфликт игнорирован")
                                        } else {
                                            toast.error("Ошибка обновления")
                                        }
                                    } finally {
                                        setUpdatingId(null)
                                    }
                                }}
                                disabled={updatingId === conflict.id}
                            >
                                <EyeOff className="h-4 w-4 mr-2" />
                                Игнорировать
                            </Button>
                        </div>
                    )
                }
            </CardContent>
        </Card>
    )

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">{t("pageTitle")}</h2>
                    <p className="text-muted-foreground">{t("pageDescription")}</p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchConflicts} disabled={isLoading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                    {t("refresh")}
                </Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="new">{t("tabNew")}</TabsTrigger>
                    <TabsTrigger value="resolved">{t("tabResolved")}</TabsTrigger>
                    <TabsTrigger value="ignored">{t("tabIgnored")}</TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-6">
                    {isLoading ? (
                        <div className="space-y-4">
                            <Skeleton className="h-32 w-full" />
                            <Skeleton className="h-32 w-full" />
                        </div>
                    ) : agentConflicts.length === 0 ? (
                        <Card className="border-dashed">
                            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                                <AlertTriangle className="h-12 w-12 text-muted-foreground/60 mb-4" />
                                <h3 className="font-medium text-foreground">{t("noConflicts")}</h3>
                                <p className="text-sm text-muted-foreground mt-1">{t("noConflictsDesc")}</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {agentConflicts.map(renderConflictCard)}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            <FileEditorDialog
                open={!!editingFile}
                onOpenChange={(open) => {
                    if (!open) {
                        setEditingFile(null)
                        setEditingFileHighlight(undefined)
                    }
                }}
                file={editingFile}
                agentId={agentId}
                highlightText={editingFileHighlight}
            />
        </div>
    )
}
