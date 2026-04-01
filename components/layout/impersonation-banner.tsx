'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { X } from 'lucide-react'
import { stopImpersonation } from '@/actions/impersonate'
import { Button } from '@/components/ui/button'

export function ImpersonationBanner() {
  const { data: session, update } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const impersonatedBy = (session?.user as any)?.impersonatedBy
  if (!impersonatedBy) return null

  const handleStop = async () => {
    setLoading(true)
    try {
      await stopImpersonation()
      await update()
      router.push('/admin/users')
      router.refresh()
    } catch {
      setLoading(false)
    }
  }

  return (
    <div className="bg-amber-500 text-black px-4 py-1.5 text-center text-sm font-medium flex items-center justify-center gap-3 shrink-0">
      <span>
        Вы вошли как <strong>{session?.user?.email}</strong>
      </span>
      <Button
        size="sm"
        variant="outline"
        className="h-6 px-2 text-xs bg-white/80 hover:bg-white border-amber-700"
        onClick={handleStop}
        disabled={loading}
      >
        <X className="size-3 mr-1" />
        Выйти
      </Button>
    </div>
  )
}
