"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { Save, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { useUserData } from "@/components/providers/user-data-provider"

// Import sub-components
import { GeneralAgentSettingsContent } from "@/components/agents/settings/general-agent-settings"
import { AgentScheduleContent } from "@/components/agents/settings/agent-schedule"
import { FriendlyDangerZone } from "@/components/agents/settings/friendly-danger-zone"

export default function AgentSettingsPage() {
    const params = useParams()
    const agentId = params?.agentId as string
    const { agents, refreshAgents } = useUserData()
    const agent = agents.find(a => a.id === agentId)

    const [isSaving, setIsSaving] = React.useState(false)

    // Refs to get data from sub-components
    const generalSettingsRef = React.useRef<{ getData: () => any; isDirty: () => boolean } | null>(null)
    const scheduleRef = React.useRef<{ getData: () => any; isDirty: () => boolean } | null>(null)

    // Autosave timer
    const autosaveTimerRef = React.useRef<NodeJS.Timeout | null>(null)
    const AUTOSAVE_INTERVAL = 30000 // 30 seconds

    // Snapshot of latest data for save-on-unmount
    const latestDataRef = React.useRef<{ general: any; schedule: any } | null>(null)

    // Track changes for autosave
    const handleChange = React.useCallback(() => {
        // Snapshot current data for save-on-unmount
        latestDataRef.current = {
            general: generalSettingsRef.current?.getData(),
            schedule: scheduleRef.current?.getData(),
        }

        // Reset autosave timer
        if (autosaveTimerRef.current) {
            clearTimeout(autosaveTimerRef.current)
        }

        autosaveTimerRef.current = setTimeout(() => {
            handleSaveAll(true) // silent autosave
        }, AUTOSAVE_INTERVAL)
    }, [])

    // Cleanup on unmount + save unsaved changes
    React.useEffect(() => {
        return () => {
            if (autosaveTimerRef.current) {
                clearTimeout(autosaveTimerRef.current)
            }
            // Save on unmount if there are unsaved changes (fire-and-forget)
            const data = latestDataRef.current
            if (!data) return

            if (data.general) {
                fetch(`/api/agents/${agentId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: data.general.name,
                        description: data.general.description,
                        avatarEmoji: data.general.emoji,
                    }),
                }).catch(() => {})
            }

            if (data.schedule?.schedule) {
                fetch(`/api/orchestrator/agents/${agentId}/schedule`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        schedule: data.schedule.schedule,
                        message: data.schedule.offlineMessage,
                        holidays: data.schedule.holidays,
                    }),
                }).catch(() => {})
            }

            if (data.schedule?.bufferSeconds !== undefined) {
                fetch(`/api/orchestrator/agents/${agentId}/behavior`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ debounceMs: data.schedule.bufferSeconds * 1000 }),
                }).catch(() => {})
            }
        }
    }, [])

    const handleSaveAll = async (silent = false) => {
        setIsSaving(true)
        try {
            const generalData = generalSettingsRef.current?.getData()
            const scheduleData = scheduleRef.current?.getData()

            // 1. Save general metadata
            if (generalData) {
                const res = await fetch(`/api/agents/${agentId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: generalData.name,
                        description: generalData.description,
                        avatarEmoji: generalData.emoji
                    })
                })
                if (!res.ok) throw new Error("Failed to save metadata")
            }

            // 2. Save schedule
            if (scheduleData?.schedule) {
                const res = await fetch(`/api/orchestrator/agents/${agentId}/schedule`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        schedule: scheduleData.schedule,
                        message: scheduleData.offlineMessage,
                        holidays: scheduleData.holidays
                    })
                })
                if (!res.ok) throw new Error("Failed to save schedule")
            }

            // 3. Save buffer/debounce
            if (scheduleData?.bufferSeconds !== undefined) {
                const res = await fetch(`/api/orchestrator/agents/${agentId}/behavior`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ debounceMs: scheduleData.bufferSeconds * 1000 })
                })
                if (!res.ok) throw new Error("Failed to save buffer settings")
            }

            await refreshAgents()

            // Clear snapshot so unmount doesn't re-save
            latestDataRef.current = null

            if (!silent) {
                toast.success("Все настройки сохранены")
            } else {
                toast.success("Автосохранение", { description: "Настройки сохранены" })
            }
        } catch (error) {
            console.error("Save error:", error)
            if (!silent) {
                toast.error("Ошибка сохранения", {
                    description: error instanceof Error ? error.message : "Unknown error"
                })
            }
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* General Settings with Status first, then Info with Save button */}
            <GeneralAgentSettingsContent
                ref={generalSettingsRef}
                agentId={agentId}
                agent={agent}
                onChange={handleChange}
                onSave={() => handleSaveAll(false)}
                isSaving={isSaving}
            />

            {/* Schedule */}
            <AgentScheduleContent
                ref={scheduleRef}
                agentId={agentId}
                agent={agent}
                onChange={handleChange}
            />

            {/* Danger Zone */}
            <FriendlyDangerZone />
        </div>
    )
}
