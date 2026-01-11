import { UserData } from './types'
import user001 from '@/mocks/users/user_001.json'
import user002 from '@/mocks/users/user_002.json'

const MOCK_DB: Record<string, UserData> = {
    'user_001': user001 as UserData,
    'user_002': user002 as UserData,
}

// Single source of truth for the current user ID
// In a real app, this would come from a session or cookie
let CURRENT_USER_ID = 'user_001'

export const userService = {
    getCurrentUserId: () => CURRENT_USER_ID,

    // For manual testing/switching
    setCurrentUserId: (id: string) => {
        if (MOCK_DB[id]) {
            CURRENT_USER_ID = id
            return true
        }
        return false
    },

    getUserData: async (userId: string): Promise<UserData> => {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500))

        const data = MOCK_DB[userId]
        if (!data) {
            throw new Error(`User data not found for ID: ${userId}`)
        }
        return data
    }
}
