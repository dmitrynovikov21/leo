"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

// Types for agent data from API
interface Agent {
    id: string
    name: string
    role: string
    description: string
    systemPrompt: string
    telegramToken?: string
    isTelegramConnected?: boolean
    status: 'STOPPED' | 'STARTING' | 'RUNNING' | 'ERROR'
    containerId?: string
    createdAt: string
    updatedAt: string
    // Statistics (from API or mock)
    totalDialogs?: number
    dialogsToday?: number
    source?: 'telegram' | 'whatsapp' | 'web' | null
}

interface UserContextType {
    agents: Agent[]
    isLoading: boolean
    error: Error | null
    refreshAgents: () => Promise<void>
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession()
    const [agents, setAgents] = useState<Agent[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    const loadAgents = async () => {
        if (status !== 'authenticated' || !session?.user?.id) {
            setAgents([])
            setIsLoading(false)
            return
        }

        setIsLoading(true)
        setError(null)
        try {
            const orchestratorUrl = process.env.NEXT_PUBLIC_AGENT_ORCHESTRATOR_URL

            let response: Response

            if (orchestratorUrl) {
                // Используем agent-orchestrator API
                response = await fetch(`${orchestratorUrl}/api/v1/agents?userId=${session.user.id}`)
            } else {
                // Fallback на локальный API
                response = await fetch('/api/agents')
            }

            if (!response.ok) {
                throw new Error('Failed to fetch agents')
            }
            const data = await response.json()

            // Нормализуем данные (snake_case -> camelCase)
            const normalizedAgents = (Array.isArray(data) ? data : []).map((agent: any) => ({
                id: agent.id,
                name: agent.name,
                role: agent.role,
                description: agent.description,
                systemPrompt: agent.system_prompt || agent.systemPrompt || '',
                telegramToken: agent.telegram_token || agent.telegramToken,
                isTelegramConnected: agent.is_telegram_connected || agent.isTelegramConnected || !!(agent.telegram_token || agent.telegramToken),
                status: agent.status || 'STOPPED',
                containerId: agent.container_id || agent.containerId,
                createdAt: agent.created_at || agent.createdAt,
                updatedAt: agent.updated_at || agent.updatedAt,
                // Statistics
                totalDialogs: agent.total_dialogs || agent.totalDialogs || 0,
                dialogsToday: agent.dialogs_today || agent.dialogsToday || 0,
                source: (agent.telegram_token || agent.telegramToken ? 'telegram' : null) as 'telegram' | 'whatsapp' | 'web' | null,
            }))

            setAgents(normalizedAgents)
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to load agents'))
            setAgents([])
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        if (status !== 'loading') {
            loadAgents()
        }
    }, [status])

    return (
        <UserContext.Provider value={{
            agents,
            isLoading: isLoading || status === 'loading',
            error,
            refreshAgents: loadAgents
        }}>
            {children}
        </UserContext.Provider>
    )
}

export function useUserData() {
    const context = useContext(UserContext)
    if (context === undefined) {
        throw new Error('useUserData must be used within a UserProvider')
    }
    return context
}

export function useUser() {
    const context = useContext(UserContext)
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider')
    }
    return context
}
