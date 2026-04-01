'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { getAdminTickets, updateTicketStatus, getSupportStats } from '@/actions/admin-support'
import { getTicketMessages, sendMessage } from '@/actions/support'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Send, Paperclip, X, ArrowLeft, File, MessageSquare, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { SupportTicketStatus } from '@prisma/client'

type AdminTicket = Awaited<ReturnType<typeof getAdminTickets>>['tickets'][number]
type TicketDetail = Awaited<ReturnType<typeof getTicketMessages>>
type Attachment = { filename: string; storedName: string; size: number; mimeType: string }

const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  OPEN: { label: 'Открыт', variant: 'default' },
  IN_PROGRESS: { label: 'В работе', variant: 'secondary' },
  RESOLVED: { label: 'Решён', variant: 'outline' },
  CLOSED: { label: 'Закрыт', variant: 'destructive' },
}

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<AdminTicket[]>([])
  const [selectedTicket, setSelectedTicket] = useState<TicketDetail | null>(null)
  const [stats, setStats] = useState({ open: 0, inProgress: 0, resolved: 0, total: 0 })
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const loadTickets = useCallback(async () => {
    try {
      const [data, statsData] = await Promise.all([
        getAdminTickets({ status: filter, search: search || undefined }),
        getSupportStats(),
      ])
      setTickets(data.tickets)
      setStats(statsData)
    } catch (e) {
      toast.error('Не удалось загрузить запросы')
    } finally {
      setLoading(false)
    }
  }, [filter, search])

  useEffect(() => {
    loadTickets()
  }, [loadTickets])

  const openTicket = async (ticketId: string) => {
    try {
      const data = await getTicketMessages(ticketId)
      setSelectedTicket(data)
    } catch (e) {
      toast.error('Не удалось открыть запрос')
    }
  }

  const handleStatusChange = async (status: SupportTicketStatus) => {
    if (!selectedTicket) return
    try {
      await updateTicketStatus(selectedTicket.id, status)
      const data = await getTicketMessages(selectedTicket.id)
      setSelectedTicket(data)
      loadTickets()
      toast.success('Статус обновлён')
    } catch (e) {
      toast.error('Ошибка')
    }
  }

  const handleMessageSent = async () => {
    if (selectedTicket) {
      const data = await getTicketMessages(selectedTicket.id)
      setSelectedTicket(data)
      loadTickets()
    }
  }

  return (
    <div className="space-y-6 p-6">

      {!selectedTicket ? (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={AlertCircle} label="Открытые" value={stats.open} color="text-orange-500" />
            <StatCard icon={Clock} label="В работе" value={stats.inProgress} color="text-blue-500" />
            <StatCard icon={CheckCircle} label="Решённые" value={stats.resolved} color="text-green-500" />
            <StatCard icon={MessageSquare} label="Всего" value={stats.total} color="text-muted-foreground" />
          </div>

          {/* Filters */}
          <div className="flex gap-3">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Все</SelectItem>
                <SelectItem value="OPEN">Открытые</SelectItem>
                <SelectItem value="IN_PROGRESS">В работе</SelectItem>
                <SelectItem value="RESOLVED">Решённые</SelectItem>
                <SelectItem value="CLOSED">Закрытые</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Поиск по теме или email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
          </div>

          {/* Ticket list */}
          {loading ? (
            <p className="text-muted-foreground">Загрузка...</p>
          ) : tickets.length === 0 ? (
            <p className="text-muted-foreground">Нет запросов</p>
          ) : (
            <div className="rounded-lg border divide-y">
              {tickets.map((t) => (
                <button
                  key={t.id}
                  onClick={() => openTicket(t.id)}
                  className="flex w-full items-start gap-4 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{t.subject}</span>
                      <Badge {...{ variant: statusMap[t.status]?.variant || 'default' }} className="shrink-0 text-[10px]">
                        {statusMap[t.status]?.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t.user.name || t.user.email} &middot; {t.messageCount} сообщ.
                    </p>
                    {t.lastMessage && (
                      <p className="mt-1 text-sm text-muted-foreground truncate">
                        {t.lastMessage.senderRole === 'ADMIN' ? 'Вы: ' : ''}
                        {t.lastMessage.content}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-xs text-muted-foreground">
                    {new Date(t.updatedAt).toLocaleDateString('ru-RU')}
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Ticket chat view */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => setSelectedTicket(null)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h2 className="font-semibold">{selectedTicket.subject}</h2>
                <p className="text-xs text-muted-foreground">
                  {selectedTicket.user.name || selectedTicket.user.email}
                </p>
              </div>
            </div>
            <Select value={selectedTicket.status} onValueChange={(v) => handleStatusChange(v as SupportTicketStatus)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OPEN">Открыт</SelectItem>
                <SelectItem value="IN_PROGRESS">В работе</SelectItem>
                <SelectItem value="RESOLVED">Решён</SelectItem>
                <SelectItem value="CLOSED">Закрыт</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border bg-card overflow-hidden" style={{ height: 'calc(100vh - 20rem)' }}>
            <AdminChatView ticket={selectedTicket} onMessageSent={handleMessageSent} />
          </div>
        </>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <Icon className={cn('h-5 w-5', color)} />
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function AdminChatView({
  ticket,
  onMessageSent,
}: {
  ticket: TicketDetail
  onMessageSent: () => void
}) {
  const [message, setMessage] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [ticket.messages])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 1024 * 1024) {
      toast.error('Максимальный размер файла 1 МБ')
      return
    }
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/support/upload', { method: 'POST', body: form })
      if (!res.ok) throw new Error((await res.json()).error)
      const data = await res.json()
      setAttachments((prev) => [...prev, data])
    } catch (err: any) {
      toast.error(err.message || 'Ошибка загрузки')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleSend = async () => {
    if (!message.trim() && attachments.length === 0) return
    setSending(true)
    try {
      await sendMessage({
        ticketId: ticket.id,
        content: message || '[Файл]',
        attachments: attachments.length > 0 ? attachments : undefined,
      })
      setMessage('')
      setAttachments([])
      onMessageSent()
    } catch (err: any) {
      toast.error(err.message || 'Ошибка')
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isClosed = ticket.status === 'CLOSED'

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {ticket.messages.map((m) => (
          <div key={m.id} className={cn('flex', m.sender.role === 'ADMIN' ? 'justify-end' : 'justify-start')}>
            <div
              className={cn(
                'max-w-[75%] rounded-2xl px-4 py-2.5',
                m.sender.role === 'ADMIN'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground'
              )}
            >
              <p className="text-xs font-medium mb-1 opacity-70">
                {m.sender.name || m.sender.email}
              </p>
              <p className="text-sm whitespace-pre-wrap">{m.content}</p>
              {m.attachments && (m.attachments as Attachment[]).length > 0 && (
                <div className="mt-2 space-y-1">
                  {(m.attachments as Attachment[]).map((a, i) => {
                    const isImage = a.mimeType.startsWith('image/')
                    const url = `/api/support/files/${a.storedName}`
                    if (isImage) {
                      return (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block">
                          <img src={url} alt={a.filename} className="max-w-[240px] max-h-[180px] rounded-lg object-cover" />
                        </a>
                      )
                    }
                    return (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs bg-background/10">
                        <File className="h-4 w-4 shrink-0" />
                        <span className="truncate">{a.filename}</span>
                      </a>
                    )
                  })}
                </div>
              )}
              <p className={cn('text-[10px] mt-1', m.sender.role === 'ADMIN' ? 'text-primary-foreground/60' : 'text-muted-foreground')}>
                {new Date(m.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
      </div>

      {!isClosed ? (
        <div className="border-t border-border p-3">
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {attachments.map((a, i) => (
                <div key={i} className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs">
                  <File className="h-3 w-3" />
                  {a.filename}
                  <button onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}>
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <label className="cursor-pointer shrink-0">
              <input type="file" className="hidden" onChange={handleUpload} accept="image/*,.pdf,.txt" />
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border hover:bg-muted transition-colors">
                <Paperclip className={cn('h-4 w-4', uploading && 'animate-pulse')} />
              </div>
            </label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ответить..."
              className="min-h-[40px] max-h-[120px] resize-none rounded-xl"
              rows={1}
            />
            <Button
              size="icon"
              className="shrink-0 rounded-xl"
              onClick={handleSend}
              disabled={sending || (!message.trim() && attachments.length === 0)}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="border-t p-3 text-center text-sm text-muted-foreground">Запрос закрыт</div>
      )}
    </div>
  )
}
