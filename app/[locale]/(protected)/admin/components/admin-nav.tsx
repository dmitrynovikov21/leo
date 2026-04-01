'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const links = [
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/users', label: 'Пользователи' },
  { href: '/admin/agents', label: 'Агенты' },
  { href: '/admin/billing', label: 'Биллинг' },
  { href: '/admin/unit-economics', label: 'Экономика' },
  { href: '/admin/users-balance', label: 'Балансы' },
  { href: '/admin/subscriptions', label: 'Подписки' },
  { href: '/admin/plans', label: 'Тарифы' },
  { href: '/admin/model-costs', label: 'Стоимость моделей' },
  { href: '/admin/token-rates', label: 'Курсы' },
  { href: '/admin/support', label: 'Запросы' },
  { href: '/admin/prompts', label: 'Промпты' },
  { href: '/admin/system-logs', label: 'Логи' },
  { href: '/admin/project-docs', label: 'Документация' },
]

export function AdminNav() {
  const pathname = usePathname()
  const cleanPath = pathname.replace(/^\/[a-z]{2}/, '')

  return (
    <nav className="flex flex-wrap gap-1.5 border-b border-border pb-4">
      {links.map(link => {
        const active = link.exact
          ? cleanPath === link.href
          : cleanPath === link.href || cleanPath.startsWith(link.href + '/')
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
