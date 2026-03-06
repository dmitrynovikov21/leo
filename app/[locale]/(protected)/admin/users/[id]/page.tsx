import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { getCurrentUser } from '@/lib/session'
import { getAdminUserDetail } from '@/actions/admin-users'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { UserDetailView } from './components/user-detail-view'
import { cn } from '@/lib/utils'

interface Props {
  params: { id: string }
}

export default async function AdminUserDetailPage({ params }: Props) {
  const currentUser = await getCurrentUser()
  if (!currentUser || currentUser.role !== 'ADMIN') redirect('/login')

  let data
  try {
    data = await getAdminUserDetail(params.id)
  } catch {
    notFound()
  }

  const { user } = data

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/users" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
          <ArrowLeft className="size-4 mr-1" />
          Назад
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{user.email || user.name || user.id}</h1>
            <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>{user.role}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Зарегистрирован: {new Date(user.createdAt).toLocaleDateString('ru-RU')}
          </p>
        </div>
      </div>

      <UserDetailView data={data} />
    </div>
  )
}
