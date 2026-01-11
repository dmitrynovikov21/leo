"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { AlertTriangle, Trash2, Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { useUserData } from "@/components/providers/user-data-provider"

export function FriendlyDangerZone() {
    const params = useParams()
    const router = useRouter()
    const agentId = params?.agentId as string
    const { agents, refreshAgents } = useUserData()
    const agent = agents.find(a => a.id === agentId)

    const [showDeleteModal, setShowDeleteModal] = React.useState(false)
    const [confirmText, setConfirmText] = React.useState("")
    const [isDeleting, setIsDeleting] = React.useState(false)

    const handleDelete = async () => {
        const orchestratorUrl = process.env.NEXT_PUBLIC_AGENT_ORCHESTRATOR_URL
        if (!orchestratorUrl) {
            toast.error("Orchestrator URL not configured")
            return
        }

        setIsDeleting(true)
        try {
            // First stop the agent if running
            if (agent?.status === 'RUNNING') {
                await fetch(`${orchestratorUrl}/api/v1/agents/${agentId}/stop`, {
                    method: 'POST'
                })
            }

            // Delete the agent
            const res = await fetch(`${orchestratorUrl}/api/v1/agents/${agentId}`, {
                method: 'DELETE'
            })

            if (!res.ok) {
                throw new Error("Failed to delete agent")
            }

            toast.success("Агент успешно удалён")
            await refreshAgents()
            setShowDeleteModal(false)

            // Redirect to agents list
            router.push('/dashboard/agents')
        } catch (error) {
            console.error("Delete error:", error)
            toast.error("Ошибка при удалении агента")
        } finally {
            setIsDeleting(false)
        }
    }

    const isConfirmValid = confirmText === "УДАЛИТЬ"

    return (
        <div className="space-y-6 pt-6 border-t border-dashed border-zinc-200">
            <div>
                <h3 className="text-lg font-bold text-zinc-900">Управление агентом</h3>
                <p className="text-sm text-zinc-500 mt-1">
                    Действия, связанные с удалением или сбросом агента.
                </p>
            </div>

            <Card className="border border-red-100 bg-red-50/10 shadow-none rounded-2xl overflow-hidden">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="text-sm font-bold text-zinc-900">Удалить агента</h4>
                            <p className="text-xs text-zinc-500 mt-1 max-w-lg leading-relaxed">
                                Это действие безвозвратно удалит агента и все связанные с ним диалоги, настройки и историю. Это действие нельзя отменить.
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl border-red-200 hover:bg-red-50 text-red-600 hover:text-red-700 font-medium transition-colors h-10 px-4"
                            onClick={() => setShowDeleteModal(true)}
                        >
                            Удалить навсегда
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Delete Confirmation Modal */}
            <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
                <DialogContent className="sm:max-w-[400px] rounded-2xl p-6 border-zinc-200 shadow-xl">
                    <DialogHeader className="text-center">
                        <div className="mx-auto h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                            <AlertTriangle className="h-8 w-8 text-red-600" />
                        </div>
                        <DialogTitle className="text-xl font-bold text-zinc-900">
                            Удалить агента?
                        </DialogTitle>
                        <DialogDescription className="text-zinc-500 mt-2">
                            Вы собираетесь удалить агента <strong>{agent?.name}</strong>.
                            Все данные будут потеряны безвозвратно.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mt-4 space-y-4">
                        <div>
                            <p className="text-sm text-zinc-600 mb-2">
                                Введите <strong className="text-red-600">УДАЛИТЬ</strong> для подтверждения:
                            </p>
                            <Input
                                value={confirmText}
                                onChange={(e) => setConfirmText(e.target.value)}
                                placeholder="УДАЛИТЬ"
                                className="rounded-xl"
                            />
                        </div>

                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                className="flex-1 rounded-xl h-11"
                                onClick={() => {
                                    setShowDeleteModal(false)
                                    setConfirmText("")
                                }}
                                disabled={isDeleting}
                            >
                                Отмена
                            </Button>
                            <Button
                                variant="destructive"
                                className="flex-1 rounded-xl h-11"
                                onClick={handleDelete}
                                disabled={!isConfirmValid || isDeleting}
                            >
                                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isDeleting ? "Удаление..." : "Удалить"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
