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
    avatarEmoji?: string
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

interface UserData {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
    profile: {
        plan: string
    }
}

interface UserContextType {
    agents: Agent[]
    userData: UserData | null
    isLoading: boolean
    error: Error | null
    refreshAgents: () => Promise<void>
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession()
    const [agents, setAgents] = useState<Agent[]>([])
    const [userData, setUserData] = useState<UserData | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    const loadData = async () => {
        if (status !== 'authenticated' || !session?.user?.id) {
            setAgents([])
            setUserData(null)
            setIsLoading(false)
            return
        }

        setIsLoading(true)
        setError(null)
        try {
            // Load agents
            const orchestratorUrl = process.env.NEXT_PUBLIC_AGENT_ORCHESTRATOR_URL
            let agentsResponse: Response | null = null

            // Try orchestrator first, but fallback to local API on any error
            if (orchestratorUrl) {
                try {
                    agentsResponse = await fetch(`${orchestratorUrl}/api/v1/agents?userId=${session.user.id}`, {
                        signal: AbortSignal.timeout(3000) // 3 second timeout
                    })
                    if (!agentsResponse.ok) {
                        console.warn('[UserProvider] Orchestrator failed, falling back to local API')
                        agentsResponse = null
                    }
                } catch (orchestratorError) {
                    console.warn('[UserProvider] Orchestrator unavailable:', orchestratorError)
                    agentsResponse = null
                }
            }

            // Fallback to local API
            if (!agentsResponse) {
                agentsResponse = await fetch('/api/agents')
            }

            if (!agentsResponse.ok) {
                throw new Error('Failed to fetch agents')
            }
            const agentsData = await agentsResponse.json()

            // Нормализуем данные (snake_case -> camelCase)
            const normalizedAgents = (Array.isArray(agentsData) ? agentsData : []).map((agent: any) => ({
                id: agent.id,
                name: agent.name,
                role: agent.role,
                description: agent.description,
                systemPrompt: agent.system_prompt || agent.systemPrompt || '',
                telegramToken: agent.telegram_token || agent.telegramToken,
                avatarEmoji: agent.avatar_emoji || agent.avatarEmoji,
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

            // Load user profile
            const profileResponse = await fetch('/api/user/profile')
            if (profileResponse.ok) {
                const profileData = await profileResponse.json()
                // Derive plan from stripePriceId
                // This is a simple logic, can be expanded
                let plan = 'free'
                if (profileData.stripePriceId) {
                    // Start of logic to determine plan
                    plan = 'pro' // assume pro if any price id for now, logic can be refined
                }

                setUserData({
                    id: profileData.id,
                    name: profileData.name,
                    email: profileData.email,
                    image: profileData.image,
                    profile: {
                        plan
                    }
                })
            }

        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to load data'))
            setAgents([])
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        if (status !== 'loading') {
            loadData()
        }
    }, [status])

    return (
        <UserContext.Provider value={{
            agents,
            userData,
            isLoading: isLoading || status === 'loading',
            error,
            refreshAgents: loadData
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
