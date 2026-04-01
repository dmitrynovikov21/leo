"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Plus, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { WizardData } from "./wizard-layout"

const PRESET_RESTRICTIONS = [
    { id: "no_prices", label: "Не называть точные цены" },
    { id: "no_competitors", label: "Не обсуждать конкурентов" },
    { id: "no_legal", label: "Не давать юридических советов" },
    { id: "no_deadlines", label: "Не обещать конкретные сроки" },
    { id: "no_hallucination", label: "Не выдумывать информацию (отвечать только по базе знаний)" },
]

const FALLBACK_OPTIONS = [
    { value: "leave_phone", label: "\"Оставьте номер, менеджер свяжется\"" },
    { value: "email", label: "\"Напишите на email\"" },
    { value: "call", label: "\"Позвоните по телефону\"" },
    { value: "will_check", label: "\"Я уточню и вернусь с ответом\"" },
]

interface StepRulesProps {
    data: WizardData["step4"]
    onChange: (data: Partial<NonNullable<WizardData["step4"]>>) => void
    parsedContacts?: { phone?: string; email?: string } | null
}

export function StepRules({ data, onChange, parsedContacts }: StepRulesProps) {
    const restrictions = data?.restrictions || []
    const customRestrictions = data?.customRestrictions || []
    const fallback = data?.fallback || ""
    const fallbackContact = data?.fallbackContact || ""
    const [newRule, setNewRule] = React.useState("")

    // Pre-fill contact from parsed website data
    React.useEffect(() => {
        if (!fallbackContact && parsedContacts) {
            const contact = parsedContacts.phone || parsedContacts.email || ""
            if (contact) onChange({ fallbackContact: contact })
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const toggleRestriction = (id: string) => {
        const updated = restrictions.includes(id)
            ? restrictions.filter(r => r !== id)
            : [...restrictions, id]
        onChange({ restrictions: updated })
    }

    const addCustomRule = () => {
        const rule = newRule.trim()
        if (!rule) return
        onChange({ customRestrictions: [...customRestrictions, rule] })
        setNewRule("")
    }

    const removeCustomRule = (index: number) => {
        onChange({ customRestrictions: customRestrictions.filter((_, i) => i !== index) })
    }

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-xl font-bold">Правила агента</h3>
                <p className="text-sm text-muted-foreground mt-1">
                    Установите ограничения и поведение в нестандартных ситуациях
                </p>
            </div>

            {/* Restrictions checkboxes */}
            <div className="space-y-3">
                <Label>Чего агент НЕ должен делать?</Label>
                <div className="space-y-2">
                    {PRESET_RESTRICTIONS.map((r) => (
                        <label
                            key={r.id}
                            className={cn(
                                "flex items-center gap-3 rounded-xl border border-border p-3 cursor-pointer transition-colors hover:bg-muted/50",
                                restrictions.includes(r.id) && "border-primary/50 bg-primary/5"
                            )}
                        >
                            <Checkbox
                                checked={restrictions.includes(r.id)}
                                onCheckedChange={() => toggleRestriction(r.id)}
                            />
                            <span className="text-sm">{r.label}</span>
                        </label>
                    ))}
                </div>

                {/* Custom restrictions */}
                {customRestrictions.length > 0 && (
                    <div className="space-y-2 mt-2">
                        {customRestrictions.map((rule, i) => (
                            <div
                                key={i}
                                className="flex items-center gap-2 rounded-xl border border-border p-3 bg-muted/30"
                            >
                                <span className="text-sm flex-1">{rule}</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeCustomRule(i)}>
                                    <X className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex gap-2">
                    <Input
                        placeholder="Добавьте своё правило..."
                        value={newRule}
                        onChange={(e) => setNewRule(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomRule())}
                    />
                    <Button variant="outline" size="icon" onClick={addCustomRule} disabled={!newRule.trim()}>
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="border-t border-border pt-6 space-y-4">
                {/* Fallback behavior */}
                <div className="space-y-3">
                    <Label>Если агент не знает ответа:</Label>
                    <RadioGroup
                        value={fallback}
                        onValueChange={(v) => onChange({ fallback: v })}
                        className="space-y-2"
                    >
                        {FALLBACK_OPTIONS.map((opt) => (
                            <label
                                key={opt.value}
                                className={cn(
                                    "flex items-center gap-3 rounded-xl border border-border p-3 cursor-pointer transition-colors hover:bg-muted/50",
                                    fallback === opt.value && "border-primary/50 bg-primary/5"
                                )}
                            >
                                <RadioGroupItem value={opt.value} />
                                <span className="text-sm">{opt.label}</span>
                            </label>
                        ))}
                    </RadioGroup>
                </div>

                {/* Fallback contact */}
                <div className="space-y-2">
                    <Label>Контакт для связи</Label>
                    <Input
                        placeholder="+7 999 123-45-67 / info@company.ru"
                        value={fallbackContact}
                        onChange={(e) => onChange({ fallbackContact: e.target.value })}
                    />
                </div>
            </div>
        </div>
    )
}
