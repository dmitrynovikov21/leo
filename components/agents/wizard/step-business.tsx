"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Button } from "@/components/ui/button"
import { Loader2, ArrowRight, Globe, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { WizardData } from "./wizard-layout"

interface StepBusinessProps {
    data: WizardData["step1"]
    onChange: (data: Partial<NonNullable<WizardData["step1"]>>) => void
}

export function StepBusiness({ data, onChange }: StepBusinessProps) {
    const [parsing, setParsing] = React.useState(false)
    const [parseSuccess, setParseSuccess] = React.useState(false)
    const [parseError, setParseError] = React.useState("")

    const handleParseUrl = async () => {
        const url = data?.url?.trim()
        if (!url) return

        setParsing(true)
        setParseError("")
        setParseSuccess(false)

        try {
            const res = await fetch("/api/ai/parse-website", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url }),
            })
            const result = await res.json()

            if (result.parsed) {
                const p = result.parsed
                const updates: Partial<NonNullable<WizardData["step1"]>> = {
                    parsedData: p,
                }
                if (p.businessDescription && !data?.businessDescription) {
                    updates.businessDescription = p.businessDescription
                }
                if (p.city && !data?.city) {
                    updates.city = p.city
                }
                if (p.audience && !data?.audience) {
                    updates.audience = p.audience
                }
                if (p.companyName && !data?.agentName) {
                    updates.agentName = p.companyName
                }
                onChange(updates)
                setParseSuccess(true)
            } else {
                setParseError("Не удалось извлечь данные. Заполните поля вручную.")
            }
        } catch {
            setParseError("Ошибка при анализе сайта")
        }
        setParsing(false)
    }

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Расскажите о бизнесе</h2>
                <p className="text-muted-foreground">
                    Эта информация поможет создать точную инструкцию для агента
                </p>
            </div>

            {/* URL parsing */}
            <div className="space-y-2">
                <Label className="text-foreground font-medium">Сайт компании <span className="text-muted-foreground font-normal">(необязательно)</span></Label>
                <div className="flex gap-2">
                    <Input
                        placeholder="https://example.com"
                        value={data?.url || ""}
                        onChange={(e) => onChange({ url: e.target.value })}
                        className="h-10 rounded-xl border-transparent bg-muted/50 focus:bg-card focus:ring-2 focus:ring-ring transition-all font-medium text-foreground"
                    />
                    <Button
                        variant="outline"
                        size="icon"
                        className="rounded-xl h-10 w-10"
                        onClick={handleParseUrl}
                        disabled={!data?.url?.trim() || parsing}
                    >
                        {parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                    </Button>
                </div>
                {parsing && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Globe className="h-3 w-3 animate-pulse" />
                        Анализируем сайт... может занять до 30 секунд
                    </p>
                )}
                {parseSuccess && (
                    <p className="text-xs text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Сайт проанализирован. Проверьте и поправьте если нужно.
                    </p>
                )}
                {parseError && (
                    <p className="text-xs text-red-500">{parseError}</p>
                )}
            </div>

            {/* Agent name */}
            <div className="space-y-2">
                <Label className="text-foreground font-medium">Имя агента <span className="text-red-500">*</span></Label>
                <Input
                    placeholder="Например: Анна"
                    value={data?.agentName || ""}
                    onChange={(e) => onChange({ agentName: e.target.value })}
                    className="h-10 rounded-xl border-transparent bg-muted/50 focus:bg-card focus:ring-2 focus:ring-ring transition-all font-medium text-foreground"
                />
            </div>

            {/* Business description */}
            <div className="space-y-2">
                <Label className="text-foreground font-medium">Чем занимается ваш бизнес? <span className="text-red-500">*</span></Label>
                <Textarea
                    placeholder="Например: доставка цветов, букеты на заказ и корпоративные подписки"
                    value={data?.businessDescription || ""}
                    onChange={(e) => onChange({ businessDescription: e.target.value })}
                    rows={3}
                    className="rounded-xl border-transparent bg-muted/50 focus:bg-card focus:ring-2 focus:ring-ring transition-all font-medium text-foreground resize-none"
                />
            </div>

            {/* City */}
            <div className="space-y-2">
                <Label className="text-foreground font-medium">Город / регион</Label>
                <Input
                    placeholder="Москва / Работаем онлайн"
                    value={data?.city || ""}
                    onChange={(e) => onChange({ city: e.target.value })}
                    className="h-10 rounded-xl border-transparent bg-muted/50 focus:bg-card focus:ring-2 focus:ring-ring transition-all font-medium text-foreground"
                />
            </div>

            {/* Audience */}
            <div className="space-y-2">
                <Label className="text-foreground font-medium">Кто ваши клиенты?</Label>
                <RadioGroup
                    value={data?.audience || ""}
                    onValueChange={(v) => onChange({ audience: v })}
                    className="grid grid-cols-2 gap-3"
                >
                    {[
                        { value: "b2c", label: "Частные лица (B2C)" },
                        { value: "b2b", label: "Компании (B2B)" },
                        { value: "internal", label: "Сотрудники (внутренний бот)" },
                        { value: "mixed", label: "Смешанный" },
                    ].map((opt) => (
                        <label
                            key={opt.value}
                            className={cn(
                                "flex items-center gap-3 rounded-2xl border border-border p-4 cursor-pointer transition-all hover:bg-muted/50",
                                data?.audience === opt.value && "border-primary bg-primary/5 shadow-sm"
                            )}
                        >
                            <RadioGroupItem value={opt.value} />
                            <span className="text-sm font-medium">{opt.label}</span>
                        </label>
                    ))}
                </RadioGroup>
            </div>
        </div>
    )
}
