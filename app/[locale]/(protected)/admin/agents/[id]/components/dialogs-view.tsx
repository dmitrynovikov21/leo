'use client'

import { useState } from 'react'
import { getAgentDialog } from '@/actions/admin-agents'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import type { AdminAgentDetail } from '@/actions/admin-agents'

type Dialog = AdminAgentDetail['dialogs'][0]
type Message = { id: string; type: string; content: string; timestamp: Date }

const MSG_COLORS: Record<string, string> = {
  HUMAN: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 ml-auto',
  AI: 'bg-card border-border',
  SYSTEM: 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800 text-xs',
  TOOL: 'bg-muted border-border text-xs font-mono',
}

interface Props {
  agentId: string
  dialogs: Dialog[]
}

export function DialogsView({ agentId, dialogs }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [summary, setSummary] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const openDialog = async (telegramUserId: string) => {
    if (selectedId === telegramUserId) return
    setSelectedId(telegramUserId)
    setLoading(true)
    try {
      const res = await getAgentDialog(agentId, telegramUserId)
      setMessages(res.messages)
      setSummary(res.summary?.summary ?? null)
    } catch {
      toast.error('Не удалось загрузить диалог')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2" style={{ minHeight: 400 }}>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Диалоги ({dialogs.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[500px] overflow-y-auto divide-y divide-border">
            {dialogs.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Нет диалогов</p>
            ) : (
              dialogs.map(d => (
                <button
                  key={d.telegramUserId}
                  onClick={() => openDialog(d.telegramUserId)}
                  className={`w-full text-left px-4 py-3 transition-colors hover:bg-muted ${
                    selectedId === d.telegramUserId ? 'bg-muted' : ''
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-sm font-medium">TG: {d.telegramUserId}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(d.lastTime).toLocaleDateString('ru-RU')}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{d.lastMessage || '—'}</p>
                  <span className="text-xs text-muted-foreground">{d.messageCount} сообщ.</span>
                </button>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            {selectedId ? `Диалог с TG: ${selectedId}` : 'Выберите диалог'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Загрузка...</p>
          ) : !selectedId ? (
            <p className="text-sm text-muted-foreground">Кликните на диалог слева</p>
          ) : (
            <div className="space-y-3">
              {summary && (
                <div className="rounded border border-border bg-muted p-3 text-xs">
                  <strong>Суммаризация:</strong> {summary}
                </div>
              )}
              <div className="max-h-[400px] overflow-y-auto space-y-2">
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`rounded border p-2 max-w-[90%] ${MSG_COLORS[msg.type] ?? 'bg-card border-border'}`}
                  >
                    <div className="flex justify-between items-center mb-1 gap-2">
                      <Badge variant="outline" className="text-xs px-1 py-0">{msg.type}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(msg.timestamp).toLocaleTimeString('ru-RU')}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
