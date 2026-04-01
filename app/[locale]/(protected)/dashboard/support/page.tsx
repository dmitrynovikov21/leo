'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { getUserTickets, createTicket, getTicketMessages, sendMessage } from '@/actions/support'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, Send, Paperclip, X, File, MessageSquare, Headphones } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type Ticket = Awaited<ReturnType<typeof getUserTickets>>[number]
type TicketDetail = Awaited<ReturnType<typeof getTicketMessages>>
type Attachment = { filename: string; storedName: string; size: number; mimeType: string }

const statusMap: Record<string, { label: string; color: string }> = {
  OPEN: { label: 'Открыт', color: 'bg-blue-500' },
  IN_PROGRESS: { label: 'В работе', color: 'bg-amber-500' },
  RESOLVED: { label: 'Решён', color: 'bg-green-500' },
  CLOSED: { label: 'Закрыт', color: 'bg-zinc-400' },
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [selectedTicket, setSelectedTicket] = useState<TicketDetail | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const loadTickets = useCallback(async () => {
    try {
      const data = await getUserTickets()
      setTickets(data)
    } catch (e) {
      toast.error('Не удалось загрузить запросы')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTickets()
  }, [loadTickets])

  // Auto-select first ticket or create default
  useEffect(() => {
    if (!loading && !selectedId && tickets.length > 0) {
      openTicket(tickets[0].id)
    }
  }, [loading, tickets, selectedId])

  const openTicket = async (ticketId: string) => {
    setSelectedId(ticketId)
    try {
      const data = await getTicketMessages(ticketId)
      setSelectedTicket(data)
    } catch (e) {
      toast.error('Не удалось открыть диалог')
    }
  }

  const handleNewTicket = async () => {
    try {
      const result = await createTicket({
        subject: 'Новый запрос',
        message: 'Здравствуйте, мне нужна помощь.',
      })
      await loadTickets()
      if (result?.id) {
        openTicket(result.id)
      }
    } catch (err: any) {
      toast.error(err.message || 'Ошибка создания')
    }
  }

  const handleMessageSent = async () => {
    if (selectedTicket) {
      const data = await getTicketMessages(selectedTicket.id)
      setSelectedTicket(data)
      loadTickets() // refresh last message in sidebar
    }
  }

  // Polling for new messages
  useEffect(() => {
    if (!selectedTicket) return
    const interval = setInterval(async () => {
      try {
        const data = await getTicketMessages(selectedTicket.id)
        setSelectedTicket(data)
      } catch {}
    }, 10000)
    return () => clearInterval(interval)
  }, [selectedTicket?.id])

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden rounded-2xl border border-border bg-card m-6 mt-0">
      {/* Left panel — ticket list */}
      <div className="w-[320px] shrink-0 border-r border-border flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Диалоги</h2>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={handleNewTicket}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          {loading ? (
            <div className="p-4 text-sm text-muted-foreground">Загрузка...</div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
              <Headphones className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Нет диалогов</p>
              <Button size="sm" onClick={handleNewTicket}>
                <Plus className="mr-2 h-3.5 w-3.5" />
                Написать в поддержку
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {tickets.map((t) => {
                const isActive = selectedId === t.id
                const status = statusMap[t.status]
                return (
                  <button
                    key={t.id}
                    onClick={() => openTicket(t.id)}
                    className={cn(
                      'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors',
                      isActive ? 'bg-muted' : 'hover:bg-muted/50'
                    )}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary mt-0.5">
                      <Headphones className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium truncate text-foreground">{t.subject}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {new Date(t.updatedAt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', status?.color || 'bg-zinc-400')} />
                        <p className="text-xs text-muted-foreground truncate">
                          {t.lastMessage?.senderRole === 'ADMIN' ? 'Поддержка: ' : ''}
                          {t.lastMessage?.content || 'Нет сообщений'}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Right panel — chat */}
      <div className="flex-1 flex flex-col">
        {selectedTicket ? (
          <ChatView ticket={selectedTicket} onMessageSent={handleMessageSent} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <MessageSquare className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-sm">Выберите диалог или создайте новый</p>
          </div>
        )}
      </div>
    </div>
  )
}

function ChatView({
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
        content: message || (attachments.length > 0 ? '[Файл]' : ''),
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
  const status = statusMap[ticket.status]

  return (
    <>
      {/* Chat header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Headphones className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{ticket.subject}</h3>
            <div className="flex items-center gap-1.5">
              <span className={cn('h-1.5 w-1.5 rounded-full', status?.color)} />
              <span className="text-xs text-muted-foreground">{status?.label}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-3">
        {ticket.messages.map((m) => (
          <div key={m.id} className={cn('flex', m.isOwn ? 'justify-end' : 'justify-start')}>
            <div
              className={cn(
                'max-w-[70%] rounded-2xl px-4 py-2.5',
                m.isOwn
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground'
              )}
            >
              {!m.isOwn && (
                <p className="text-xs font-medium mb-1 opacity-70">
                  {m.sender.name || 'Поддержка'}
                </p>
              )}
              <p className="text-sm whitespace-pre-wrap">{m.content}</p>
              {m.attachments && (m.attachments as Attachment[]).length > 0 && (
                <div className="mt-2 space-y-1">
                  {(m.attachments as Attachment[]).map((a, i) => {
                    const url = `/api/support/files/${a.storedName}`
                    const isImage = a.mimeType.startsWith('image/')
                    if (isImage) {
                      return (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block">
                          <img src={url} alt={a.filename} className="max-w-[240px] max-h-[180px] rounded-lg object-cover" />
                        </a>
                      )
                    }
                    return (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                        className={cn('flex items-center gap-2 rounded-lg px-3 py-2 text-xs', m.isOwn ? 'bg-primary-foreground/10' : 'bg-background')}>
                        <File className="h-4 w-4 shrink-0" />
                        <span className="truncate">{a.filename}</span>
                      </a>
                    )
                  })}
                </div>
              )}
              <p className={cn('text-[10px] mt-1', m.isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground')}>
                {new Date(m.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      {!isClosed ? (
        <div className="border-t border-border p-4">
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
              placeholder="Напишите сообщение..."
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
        <div className="border-t border-border p-4 text-center text-sm text-muted-foreground">
          Запрос закрыт
        </div>
      )}
    </>
  )
}
