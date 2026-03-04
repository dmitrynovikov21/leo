"use client"

import * as React from "react"
import { CalendarClock, Globe, Moon, Clock, Loader2, RefreshCw, Send } from "lucide-react"
import { toast } from "sonner"
import { useUserData } from "@/components/providers/user-data-provider"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { TelegramConnectionDialog } from "@/components/agents/telegram-connection-dialog"

import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

const days = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]
const hours = Array.from({ length: 24 }, (_, i) => i)

interface Agent {
    id: string
    status: string
    isTelegramConnected?: boolean
    telegramToken?: string
}

interface AgentScheduleContentProps {
    agentId: string
    agent: Agent | undefined
    onChange?: () => void
}

export interface ScheduleRef {
    getData: () => {
        schedule: boolean[][]
        offlineMessage: string
        holidays: string[]
        bufferSeconds: number
    }
    isDirty: () => boolean
}

export const AgentScheduleContent = React.forwardRef<ScheduleRef, AgentScheduleContentProps>(
    ({ agentId, agent, onChange }, ref) => {
        // 7 days x 24 hours grid
        const [schedule, setSchedule] = React.useState<boolean[][]>(() => {
            return days.map((day, dIndex) =>
                hours.map(h => dIndex < 5 && h >= 9 && h < 18)
            )
        })
        const [isMouseDown, setIsMouseDown] = React.useState(false)
        const [toggleState, setToggleState] = React.useState(true)
        const [bufferSeconds, setBufferSeconds] = React.useState([1])

        // Schedule state
        const [offlineMessage, setOfflineMessage] = React.useState("Здравствуйте! Сейчас я не на связи. Я отвечу вам в рабочее время.")
        const [holidays, setHolidays] = React.useState<string[]>([])
        const [isLoadingSchedule, setIsLoadingSchedule] = React.useState(true)
        const [isLoadingSettings, setIsLoadingSettings] = React.useState(true)

        // Initial data for dirty check
        const [initialData, setInitialData] = React.useState<any>(null)

        // Fetch schedule settings on mount
        React.useEffect(() => {
            const fetchScheduleSettings = async () => {
                const orchestratorUrl = process.env.NEXT_PUBLIC_AGENT_ORCHESTRATOR_URL
                if (!orchestratorUrl || !agentId) return

                try {
                    const res = await fetch(`${orchestratorUrl}/api/v1/agents/${agentId}/schedule`)
                    if (res.ok) {
                        const data = await res.json()
                        if (data.schedule) {
                            setSchedule(data.schedule)
                        }
                        if (data.holidays) {
                            setHolidays(data.holidays)
                        }
                        if (data.message) {
                            setOfflineMessage(data.message)
                        }
                        setInitialData(prev => ({ ...prev, schedule: data.schedule, holidays: data.holidays, message: data.message }))
                    }
                } catch (error) {
                    console.error("Failed to fetch schedule settings:", error)
                } finally {
                    setIsLoadingSchedule(false)
                }
            }

            fetchScheduleSettings()
        }, [agentId])

        // Fetch behavior settings on mount
        React.useEffect(() => {
            const fetchBehaviorSettings = async () => {
                const orchestratorUrl = process.env.NEXT_PUBLIC_AGENT_ORCHESTRATOR_URL
                if (!orchestratorUrl || !agentId) return

                try {
                    const res = await fetch(`${orchestratorUrl}/api/v1/agents/${agentId}/behavior`)
                    if (res.ok) {
                        const data = await res.json()
                        if (data.debounceMs !== undefined) {
                            const seconds = Math.round(data.debounceMs / 1000)
                            setBufferSeconds([seconds])
                            setInitialData(prev => ({ ...prev, bufferSeconds: seconds }))
                        }
                    }
                } catch (error) {
                    console.error("Failed to fetch behavior settings:", error)
                } finally {
                    setIsLoadingSettings(false)
                }
            }

            fetchBehaviorSettings()
        }, [agentId])

        // Expose methods via ref
        React.useImperativeHandle(ref, () => ({
            getData: () => ({
                schedule,
                offlineMessage,
                holidays,
                bufferSeconds: bufferSeconds[0]
            }),
            isDirty: () => {
                if (!initialData) return false
                return JSON.stringify(schedule) !== JSON.stringify(initialData.schedule) ||
                    offlineMessage !== initialData.message ||
                    JSON.stringify(holidays) !== JSON.stringify(initialData.holidays) ||
                    bufferSeconds[0] !== initialData.bufferSeconds
            }
        }))

        const handleCellAction = (d: number, h: number) => {
            const newSchedule = [...schedule]
            newSchedule[d] = [...newSchedule[d]]
            newSchedule[d][h] = toggleState
            setSchedule(newSchedule)
            onChange?.()
        }

        const onMouseDown = (d: number, h: number) => {
            setIsMouseDown(true)
            setToggleState(!schedule[d][h])
            handleCellAction(d, h)
        }

        const onMouseEnter = (d: number, h: number) => {
            if (isMouseDown) {
                handleCellAction(d, h)
            }
        }

        const handleBufferChange = (value: number[]) => {
            setBufferSeconds(value)
            onChange?.()
        }

        const handleOfflineMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            setOfflineMessage(e.target.value)
            onChange?.()
        }

        const handleAddHoliday = (date: Date | undefined) => {
            if (date) {
                const formatted = format(date, "dd.MM.yyyy")
                if (!holidays.includes(formatted)) {
                    setHolidays([...holidays, formatted])
                    onChange?.()
                }
            }
        }

        const handleRemoveHoliday = (date: string) => {
            setHolidays(holidays.filter(h => h !== date))
            onChange?.()
        }

        return (
            <div className="space-y-6" onMouseUp={() => setIsMouseDown(false)} onMouseLeave={() => setIsMouseDown(false)}>

                {/* Schedule Section */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-foreground">График доступности</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Настройте рабочие часы, когда агент будет отвечать пользователям.
                            </p>
                        </div>
                        <div className="flex items-center h-10 px-3 rounded-xl bg-muted/50 text-foreground font-medium text-sm">
                            <Globe className="mr-2 h-4 w-4 text-muted-foreground" />
                            Москва (GMT+3)
                        </div>
                    </div>

                    <Card className="border border-border shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-card rounded-2xl">
                        <CardHeader className="pb-4">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base font-semibold text-foreground">Недельный график</CardTitle>
                                <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
                                    <div className="flex items-center gap-1.5">
                                        <div className="h-3 w-3 rounded-sm bg-primary" /> Активен
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="h-3 w-3 rounded-sm bg-muted" /> Неактивен
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="select-none">
                                {/* Header Hours */}
                                <div className="flex mb-2">
                                    <div className="w-12" />
                                    <div className="flex-1 flex justify-between text-[10px] text-muted-foreground font-medium px-1 uppercase tracking-wide">
                                        <span>00:00</span>
                                        <span>06:00</span>
                                        <span>12:00</span>
                                        <span>18:00</span>
                                        <span>23:00</span>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    {days.map((day, dIndex) => (
                                        <div key={day} className="flex items-center gap-2">
                                            <span className="w-12 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{day}</span>
                                            <div className="flex-1 flex gap-[2px] h-8">
                                                {hours.map((h) => (
                                                    <div
                                                        key={h}
                                                        className={cn(
                                                            "flex-1 rounded-sm cursor-pointer transition-all duration-75",
                                                            schedule[dIndex][h]
                                                                ? "bg-primary hover:bg-primary/90"
                                                                : "bg-muted hover:bg-muted"
                                                        )}
                                                        onMouseDown={() => onMouseDown(dIndex, h)}
                                                        onMouseEnter={() => onMouseEnter(dIndex, h)}
                                                        title={`${day} ${h}:00 - ${h + 1}:00`}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Offline Behavior */}
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-base font-bold text-foreground">Поведение оффлайн</h3>
                                <p className="text-sm text-muted-foreground mt-1">Что отвечать в нерабочее время?</p>
                            </div>
                            <Card className="border border-border shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-card rounded-2xl">
                                <CardContent className="p-4 space-y-4">
                                    <Textarea
                                        placeholder="Напишите сообщение..."
                                        className="min-h-[100px] text-sm rounded-xl border-transparent bg-muted/50 focus:bg-card focus:ring-2 focus:ring-ring transition-all font-medium text-foreground placeholder:text-muted-foreground p-4 resize-none"
                                        value={offlineMessage}
                                        onChange={handleOfflineMessageChange}
                                    />
                                </CardContent>
                            </Card>
                        </div>

                        {/* Holidays */}
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-base font-bold text-foreground">Праздники</h3>
                                <p className="text-sm text-muted-foreground mt-1">Исключения из графика работы.</p>
                            </div>
                            <Card className="border border-border shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-card rounded-2xl h-[calc(100%-76px)]">
                                <CardContent className="p-4 h-full relative">
                                    {holidays.length === 0 ? (
                                        <div className="p-8 border-2 border-dashed border-border rounded-xl text-center h-full flex flex-col items-center justify-center bg-card">
                                            <p className="text-sm text-muted-foreground font-medium mb-4">Нет добавленных праздников.</p>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" size="sm" className="rounded-xl border-border bg-card hover:bg-muted/50 text-foreground font-medium shadow-sm">Добавить дату</Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="center">
                                                    <Calendar
                                                        mode="single"
                                                        onSelect={handleAddHoliday}
                                                        locale={ru}
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                    ) : (
                                        <div className="h-full flex flex-col">
                                            <div className="flex-1 overflow-auto space-y-2 mb-4">
                                                {holidays.map((date) => (
                                                    <div key={date} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg border border-border">
                                                        <span className="text-sm font-medium text-foreground">{date}</span>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500"
                                                            onClick={() => handleRemoveHoliday(date)}
                                                        >
                                                            &times;
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" size="sm" className="w-full rounded-xl border-border bg-card hover:bg-muted/50 text-foreground font-medium shadow-sm">Добавить дату</Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar
                                                        mode="single"
                                                        onSelect={handleAddHoliday}
                                                        locale={ru}
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>

                {/* Buffer / Response Delay */}
                <div className="space-y-6">
                    <div>
                        <h3 className="text-lg font-bold text-foreground">Буфер обмена (Задержка)</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            Настройте искусственную задержку перед ответом.
                        </p>
                    </div>
                    <Card className="border border-border shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-card rounded-2xl">
                        <CardContent className="pt-6 pb-6 space-y-6">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="buffer-seconds" className="font-medium text-foreground">Время задержки</Label>
                                    <Badge variant="outline" className="text-xs font-mono rounded-lg border-border bg-muted/50 text-muted-foreground">
                                        {bufferSeconds[0]} сек
                                    </Badge>
                                </div>
                                <Slider
                                    id="buffer-seconds"
                                    value={bufferSeconds}
                                    min={1}
                                    max={15}
                                    step={1}
                                    onValueChange={handleBufferChange}
                                    className="cursor-pointer"
                                />
                                <div className="flex justify-between text-xs text-muted-foreground px-1 font-medium">
                                    <span>Минимум (1с)</span>
                                    <span>Естественно (2-5с)</span>
                                    <span>Задумчиво (10с+)</span>
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Добавление небольшой задержки (2-3 секунды) делает общение с ботом более естественным, имитируя процесс чтения и набора текста человеком.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }
)

AgentScheduleContent.displayName = 'AgentScheduleContent'

// Legacy export for backward compatibility
export function AgentSchedule() {
    const [agentId, setAgentId] = React.useState<string>("")
    const { agents } = useUserData()

    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            const pathParts = window.location.pathname.split('/')
            const agentIdIndex = pathParts.indexOf('agents') + 1
            if (agentIdIndex > 0 && pathParts[agentIdIndex]) {
                setAgentId(pathParts[agentIdIndex])
            }
        }
    }, [])

    const agent = agents.find(a => a.id === agentId)

    return <AgentScheduleContent agentId={agentId} agent={agent as any} />
}
