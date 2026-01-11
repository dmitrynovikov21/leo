"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error(error)
    }, [error])

    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center bg-white min-h-[400px]">
            <div className="p-4 bg-red-50 rounded-full">
                <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold text-zinc-900">Something went wrong!</h2>
            <p className="text-zinc-500 max-w-sm mb-4">
                {error.message || "An unexpected error occurred while loading this page."}
            </p>
            <Button onClick={() => reset()} variant="outline" className="border-zinc-200">
                Try again
            </Button>
        </div>
    )
}
