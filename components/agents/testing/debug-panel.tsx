"use client"

import * as React from "react"
import { Activity, Database, FileText, Search, Zap, Trash2, Coins } from "lucide-react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Progress } from "@/components/ui/progress"
// Changed import to use sonner directly or via a wrapper if needed, 
// but based on previous steps, standard toast call is preferred. 
// However, the starter uses `sonner` via `toast` export usually. 
// I'll import `toast` from `sonner`.
import { toast } from "sonner"

export function DebugPanel() {
    const t = useTranslations('Testing');
    const [temperature, setTemperature] = React.useState([0.5])

    // Mock Sources Data for X-Ray
    const sources = [
        {
            id: 1,
            file: "Company_Policy_2024.pdf",
            page: 2,
            score: 0.98,
            text: "Сотрудники имеют право на 28 дней оплачиваемого отпуска в год...",
        },
        {
            id: 2,
            file: "Price_List_Q4.pdf",
            page: 5,
            score: 0.85,
            text: "Стандартный план стоит 2900 ₽/мес за пользователя...",
        },
    ]

    return (
        <div className="flex h-full flex-col border-l bg-muted/30">
            <div className="flex h-14 items-center border-b border-border px-4 bg-card">
                <span className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    {t('debugConsole')}
                </span>
            </div>

            <Tabs defaultValue="xray" className="flex-1 overflow-hidden flex flex-col">
                <div className="px-4 py-2 border-b bg-card">
                    <TabsList className="grid w-full grid-cols-2 bg-muted rounded-xl">
                        <TabsTrigger value="config" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">{t('config')}</TabsTrigger>
                        <TabsTrigger value="xray" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">{t('xray')}</TabsTrigger>
                    </TabsList>
                </div>

                <div className="flex-1 overflow-hidden">
                    {/* Tab: X-RAY */}
                    <TabsContent value="xray" className="h-full m-0">
                        <ScrollArea className="h-full">
                            <div className="p-4 space-y-6">
                                {/* Metrics */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('metrics')}</h4>
                                    <div className="flex flex-wrap gap-2">
                                        <Badge variant="outline" className="gap-1.5 bg-card border-border text-foreground">
                                            <Zap className="h-3 w-3 text-amber-500" />
                                            <span>1.2s</span>
                                        </Badge>
                                        <Badge variant="outline" className="gap-1.5 bg-card border-border text-foreground">
                                            <Database className="h-3 w-3 text-blue-500" />
                                            <span>450 Tok</span>
                                        </Badge>
                                        <Badge variant="outline" className="gap-1.5 bg-card border-border text-foreground">
                                            <Coins className="h-3 w-3 text-emerald-500" />
                                            <span>₽0.45</span>
                                        </Badge>
                                    </div>
                                </div>

                                <Separator />

                                {/* Retrieval */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('retrieval')}</h4>
                                        <Badge variant="secondary" className="text-[10px] bg-muted text-muted-foreground">2 Chunks</Badge>
                                    </div>

                                    <div className="space-y-3">
                                        {sources.map((source) => (
                                            <div key={source.id} className="group rounded-xl border border-border bg-card p-3 shadow-sm transition-all hover:border-border">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                                                        <span className="text-sm font-medium truncate text-foreground">{source.file}</span>
                                                    </div>
                                                    <Badge variant={source.score > 0.9 ? "default" : "secondary"} className="ml-2 shrink-0 rounded-md">
                                                        {Math.round(source.score * 100)}%
                                                    </Badge>
                                                </div>

                                                <div className="mb-3 space-y-1">
                                                    <div className="flex justify-between text-xs text-muted-foreground">
                                                        <span>{t('relevance')}</span>
                                                        <span>Page {source.page}</span>
                                                    </div>
                                                    <Progress value={source.score * 100} className="h-1.5 rounded-full bg-muted" />
                                                </div>

                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button size="sm" variant="ghost" className="w-full text-xs h-7 border border-dashed border-border text-muted-foreground hover:text-foreground">
                                                            <Search className="mr-2 h-3 w-3" />
                                                            {t('inspectContent')}
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent side="left" className="w-80 p-0 rounded-xl" align="start">
                                                        <div className="p-3 bg-muted/30 border-b">
                                                            <div className="text-xs font-medium flex items-center gap-2 text-foreground">
                                                                <FileText className="h-3 w-3" />
                                                                {source.file}
                                                            </div>
                                                        </div>
                                                        <div className="p-4 text-sm leading-relaxed max-h-[300px] overflow-y-auto bg-card">
                                                            <span className="bg-yellow-100 text-yellow-900 px-0.5 rounded">
                                                                {source.text}
                                                            </span>
                                                        </div>
                                                    </PopoverContent>
                                                </Popover>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    {/* Tab: CONFIG */}
                    <TabsContent value="config" className="h-full m-0">
                        <ScrollArea className="h-full">
                            <div className="p-4 space-y-6">
                                <div className="space-y-4">
                                    <div className="grid gap-2">
                                        <Label className="text-foreground">{t('model')}</Label>
                                        <Select defaultValue="claude-sonnet-4-6">
                                            <SelectTrigger className="rounded-xl border-border bg-card">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                <SelectItem value="claude-sonnet-4-6">Claude Sonnet 4.6</SelectItem>
                                                <SelectItem value="claude-opus-4-6">Claude Opus 4.6</SelectItem>
                                                <SelectItem value="claude-sonnet-4-5">Claude Sonnet 4.5</SelectItem>
                                                <SelectItem value="gemini-3.1-pro-preview">Gemini 3.1 Pro Preview</SelectItem>
                                                <SelectItem value="gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="grid gap-3">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-foreground">{t('temperature')}</Label>
                                            <span className="text-sm font-mono text-muted-foreground">{temperature[0]}</span>
                                        </div>
                                        <Slider
                                            value={temperature}
                                            max={1}
                                            step={0.1}
                                            onValueChange={setTemperature}
                                            className="py-1"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            {t('tempDesc')}
                                        </p>
                                    </div>

                                    <Separator />

                                    <div className="grid gap-2">
                                        <Label className="text-foreground">{t('systemPromptOverride')}</Label>
                                        <Textarea
                                            placeholder={t('overridePlaceholder')}
                                            className="min-h-[150px] font-mono text-xs rounded-xl border-border bg-muted/50 focus:bg-card resize-none p-3"
                                        />
                                        <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-100">
                                            {t('ephemeralWarning')}
                                        </p>
                                    </div>

                                    <Button
                                        variant="outline"
                                        className="w-full rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                        onClick={() => toast.success(t('historyCleared'), { description: t('historyClearedDesc') })}
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        {t('clearHistory')}
                                    </Button>
                                </div>
                            </div>
                        </ScrollArea>
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    )
}
