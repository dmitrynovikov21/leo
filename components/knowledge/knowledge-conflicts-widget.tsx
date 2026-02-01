"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { AlertTriangle, FileText, Eye, EyeOff, Check, ExternalLink, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

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
    status: "NEW" | "RESOLVED" | "IGNORED"
    detectedAt: string
    resolvedAt: string | null
}

interface KnowledgeConflictsWidgetProps {
    agentId?: string
    className?: string
}

export function KnowledgeConflictsWidget({ agentId, className }: KnowledgeConflictsWidgetProps) {
    const t = useTranslations("Conflicts")
    const [conflicts, setConflicts] = React.useState<KnowledgeConflict[]>([])
    const [isLoading, setIsLoading] = React.useState(true)
    const [updatingId, setUpdatingId] = React.useState<string | null>(null)

    const fetchConflicts = React.useCallback(async () => {
        try {
            const params = new URLSearchParams()
            params.set("status", "new") // v1 uses lowercase
            if (agentId) params.set("agentId", agentId)

            const res = await fetch(`/api/v1/conflicts?${params}`)
            if (res.ok) {
                const data = await res.json()
                // v1 returns { conflicts: [...] }
                setConflicts(data.conflicts || [])
            }
        } catch (error) {
            console.error("Failed to fetch conflicts:", error)
        } finally {
            setIsLoading(false)
        }
    }, [agentId])

    React.useEffect(() => {
        fetchConflicts()
    }, [fetchConflicts])

    const updateStatus = async (id: string, status: "RESOLVED" | "IGNORED") => {
        setUpdatingId(id)
        try {
            const res = await fetch(`/api/v1/conflicts/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: status.toLowerCase() }),
            })

            if (res.ok) {
                setConflicts(prev => prev.filter(c => c.id !== id))
                toast.success(status === "RESOLVED" ? t("conflictResolved") : t("conflictIgnored"))
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

    if (isLoading) {
        return (
            <Card className={cn("border border-amber-200/50 bg-amber-50/30", className)}>
                <CardHeader className="pb-3">
                    <Skeleton className="h-5 w-48" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-20 w-full" />
                </CardContent>
            </Card>
        )
    }

    if (conflicts.length === 0) {
        return null // Don't show widget if no conflicts
    }

    return (
        <Card className={cn("border border-amber-200/50 bg-amber-50/30 shadow-none", className)}>
            <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-amber-800">
                    <AlertTriangle className="h-4 w-4" />
                    {t("title")}
                    <Badge variant="secondary" className="ml-auto bg-amber-100 text-amber-700 border-0">
                        {conflicts.length}
                    </Badge>
                </CardTitle>
                <CardDescription className="text-amber-700/70">
                    {t("description")}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {conflicts.map((conflict) => (
                    <div
                        key={conflict.id}
                        className="rounded-xl border border-amber-200 bg-white p-4 space-y-3"
                    >
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                                <h4 className="font-medium text-sm text-zinc-900">
                                    {t("conflictLabel")}: {conflict.topic}
                                </h4>
                                <p className="text-xs text-zinc-500 mt-1">
                                    {new Date(conflict.detectedAt).toLocaleDateString("ru-RU", {
                                        day: "numeric",
                                        month: "short",
                                        year: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit"
                                    })}
                                </p>
                            </div>
                        </div>

                        {/* Conflicting files */}
                        <div className="space-y-2">
                            {conflict.details.map((file, idx) => (
                                <div
                                    key={file.file_id}
                                    className="flex items-center gap-2 text-sm bg-zinc-50 rounded-lg p-2"
                                >
                                    <FileText className="h-4 w-4 text-zinc-400 shrink-0" />
                                    <span className="font-medium text-zinc-700 truncate flex-1">
                                        {file.file_name}
                                    </span>
                                    <span className="text-zinc-500">→</span>
                                    <span className="text-zinc-900 font-mono text-xs bg-white px-2 py-1 rounded border">
                                        {file.value_found}
                                    </span>
                                    {idx < conflict.details.length - 1 && (
                                        <span className="text-amber-600 font-medium">VS</span>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-2 border-t border-zinc-100">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs"
                                onClick={() => updateStatus(conflict.id, "RESOLVED")}
                                disabled={updatingId === conflict.id}
                            >
                                {updatingId === conflict.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                ) : (
                                    <Check className="h-3 w-3 mr-1" />
                                )}
                                {t("resolve")}
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs text-zinc-500"
                                onClick={() => updateStatus(conflict.id, "IGNORED")}
                                disabled={updatingId === conflict.id}
                            >
                                <EyeOff className="h-3 w-3 mr-1" />
                                {t("ignore")}
                            </Button>
                            {conflict.details[0]?.file_id && (
                                <a
                                    href={`/dashboard/knowledge?file=${conflict.details[0].file_id}`}
                                    className="h-8 text-xs ml-auto inline-flex items-center gap-1 text-zinc-500 hover:text-zinc-700 transition-colors"
                                >
                                    <ExternalLink className="h-3 w-3" />
                                    {t("goToFile")}
                                </a>
                            )}
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}
