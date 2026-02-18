'use client'

import { useState, useEffect, useRef } from 'react'
import { getContainers, getContainerLogs, ContainerInfo } from '@/actions/system-logs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, RefreshCw, Terminal, Play, CircleStop } from 'lucide-react'
import { toast } from 'sonner'
import { ScrollArea } from '@/components/ui/scroll-area'

export default function SystemLogsPage() {
    const [containers, setContainers] = useState<ContainerInfo[]>([])
    const [selectedContainerId, setSelectedContainerId] = useState<string>('')
    const [logs, setLogs] = useState<string>('')
    const [loadingContainers, setLoadingContainers] = useState(true)
    const [loadingLogs, setLoadingLogs] = useState(false)
    const [autoRefresh, setAutoRefresh] = useState(false)
    const logsEndRef = useRef<HTMLDivElement>(null)

    // Fetch containers on mount
    useEffect(() => {
        loadContainers()
    }, [])

    // Auto-refresh logs if enabled
    useEffect(() => {
        let interval: NodeJS.Timeout
        if (autoRefresh && selectedContainerId) {
            interval = setInterval(() => {
                refreshLogs(selectedContainerId)
            }, 5000)
        }
        return () => clearInterval(interval)
    }, [autoRefresh, selectedContainerId])

    // Scroll to bottom when logs update
    useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [logs])

    const loadContainers = async () => {
        setLoadingContainers(true)
        try {
            const data = await getContainers()
            setContainers(data)
            if (data.length > 0 && !selectedContainerId) {
                setSelectedContainerId(data[0].Id)
                // refreshLogs(data[0].Id) // Optional: auto-load first container
            }
        } catch (error) {
            console.error(error)
            toast.error('Failed to load containers. Is Docker running?')
        } finally {
            setLoadingContainers(false)
        }
    }

    const refreshLogs = async (containerId: string) => {
        if (!containerId) return
        // Don't set loadingLogs on auto-refresh to assume smoother UI
        if (!autoRefresh) setLoadingLogs(true)

        try {
            const logData = await getContainerLogs(containerId, 200) // fetch last 200 lines
            setLogs(logData)
        } catch (error) {
            console.error(error)
            // toast.error('Failed to load logs') // Spammy on auto-refresh
        } finally {
            setLoadingLogs(false)
        }
    }

    const handleContainerChange = (value: string) => {
        setSelectedContainerId(value)
        setLogs('') // Clear logs on switch
        refreshLogs(value)
    }

    return (
        <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col">
            <div className="flex justify-between items-center shrink-0">
                <div>
                    <h1 className="text-3xl font-bold">Системные логи</h1>
                    <p className="text-gray-500">Просмотр логов Docker контейнеров</p>
                </div>
                <div className="flex gap-2 items-center">
                    <Button
                        variant={autoRefresh ? "destructive" : "outline"}
                        size="sm"
                        onClick={() => setAutoRefresh(!autoRefresh)}
                    >
                        {autoRefresh ? <CircleStop className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                        {autoRefresh ? "Stop Live" : "Live View"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => refreshLogs(selectedContainerId)} disabled={loadingLogs || !selectedContainerId}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${loadingLogs ? 'animate-spin' : ''}`} />
                        Обновить
                    </Button>
                </div>
            </div>

            {loadingContainers ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
            ) : containers.length === 0 ? (
                <div className="p-8 text-center border rounded-md">
                    <p>Контейнеры не найдены или нет доступа к Docker socket.</p>
                    <Button onClick={loadContainers} className="mt-4">Повторить</Button>
                </div>
            ) : (
                <div className="flex flex-col gap-4 flex-1 min-h-0">
                    <Card className="shrink-0">
                        <CardHeader className="py-4">
                            <CardTitle className="text-sm">Выберите контейнер</CardTitle>
                        </CardHeader>
                        <CardContent className="py-0 pb-4">
                            <Select value={selectedContainerId} onValueChange={handleContainerChange}>
                                <SelectTrigger className="w-full md:w-[400px]">
                                    <SelectValue placeholder="Select container" />
                                </SelectTrigger>
                                <SelectContent>
                                    {containers.map(c => (
                                        <SelectItem key={c.Id} value={c.Id}>
                                            {c.Names[0]?.replace('/', '') || c.Id.substring(0, 12)} ({c.Image}) - {c.State}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </CardContent>
                    </Card>

                    <Card className="flex-1 flex flex-col min-h-0 bg-black text-green-400 font-mono text-sm border-gray-800">
                        <CardHeader className="py-2 border-b border-gray-800 bg-gray-900/50 flex flex-row justify-between items-center">
                            <div className="flex items-center gap-2">
                                <Terminal className="h-4 w-4" />
                                <span>Console Output</span>
                            </div>
                            <span className="text-xs text-gray-500">Last 200 lines</span>
                        </CardHeader>
                        <ScrollArea className="flex-1 p-4">
                            <pre className="whitespace-pre-wrap break-all">
                                {logs || 'No logs to display...'}
                            </pre>
                            <div ref={logsEndRef} />
                        </ScrollArea>
                    </Card>
                </div>
            )}
        </div>
    )
}
