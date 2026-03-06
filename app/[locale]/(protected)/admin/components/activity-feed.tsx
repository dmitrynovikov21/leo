import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { ActivityEvent } from '@/actions/admin-dashboard'

const typeConfig: Record<ActivityEvent['type'], { label: string; variant: 'default' | 'destructive' | 'secondary' | 'outline' }> = {
  USER_REGISTERED: { label: 'Юзер', variant: 'secondary' },
  AGENT_CREATED: { label: 'Агент', variant: 'default' },
  AGENT_ERROR: { label: 'Ошибка', variant: 'destructive' },
  CONFLICT: { label: 'Конфликт', variant: 'outline' },
}

interface Props {
  events: ActivityEvent[]
}

export function ActivityFeed({ events }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Лента событий</CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">Нет событий за последние 7 дней</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {events.map(event => {
              const config = typeConfig[event.type]
              return (
                <div key={`${event.type}-${event.id}-${event.timestamp}`} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                  <Badge variant={config.variant} className="mt-0.5 shrink-0 text-xs">
                    {config.label}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{event.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(event.timestamp).toLocaleString('ru-RU')}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
