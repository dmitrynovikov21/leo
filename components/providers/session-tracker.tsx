"use client"

import * as React from "react"
import { useSession } from "next-auth/react"

export function SessionTracker() {
    const { data: session, status } = useSession()
    const tracked = React.useRef(false)

    React.useEffect(() => {
        // Track session when user is authenticated
        if (status === "authenticated" && session?.user && !tracked.current) {
            tracked.current = true

            // Fire and forget - don't block UI
            fetch("/api/user/sessions/track", {
                method: "POST",
                headers: { "Content-Type": "application/json" }
            }).catch(err => {
                console.error("Failed to track session:", err)
            })
        }

        // Reset on logout
        if (status === "unauthenticated") {
            tracked.current = false
        }
    }, [status, session])

    return null
}
