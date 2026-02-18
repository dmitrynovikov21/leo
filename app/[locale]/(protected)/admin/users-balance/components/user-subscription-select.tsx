'use client'

import { useState, useEffect } from 'react'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { getAllSubscriptionPlans, updateUserSubscriptionPlan } from '@/actions/admin-subscriptions'

interface Plan {
    id: string
    code: string
    name: string
}

interface UserSubscriptionSelectProps {
    userId: string
    currentPlanId?: string
    currentPlanCode?: string // fallback display
}

export function UserSubscriptionSelect({ userId, currentPlanId, currentPlanCode }: UserSubscriptionSelectProps) {
    const [plans, setPlans] = useState<Plan[]>([])
    const [loading, setLoading] = useState(false)
    const [currentValue, setCurrentValue] = useState(currentPlanId)

    useEffect(() => {
        // Load plans once
        getAllSubscriptionPlans().then(setPlans).catch(console.error)
    }, [])

    const handleValueChange = async (newPlanId: string) => {
        setLoading(true)
        const oldVal = currentValue
        setCurrentValue(newPlanId) // Optimistic update

        try {
            const result = await updateUserSubscriptionPlan(userId, newPlanId)
            if (!result.success) {
                throw new Error(result.error)
            }
            toast.success("План обновлен")
        } catch (error) {
            console.error(error)
            toast.error("Ошибка обновления плана")
            setCurrentValue(oldVal) // Revert
        } finally {
            setLoading(false)
        }
    }

    // Default label if plan not found in loaded list yet
    const currentLabel = plans.find(p => p.id === currentValue)?.name || currentPlanCode || "Нет подписки"

    return (
        <Select
            value={currentValue}
            onValueChange={handleValueChange}
            disabled={loading || plans.length === 0}
        >
            <SelectTrigger className="w-[140px] h-8">
                <SelectValue placeholder={currentLabel} />
            </SelectTrigger>
            <SelectContent>
                {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                        {plan.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
