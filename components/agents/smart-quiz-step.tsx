"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    ShoppingCart,
    UserCheck,
    HeadphonesIcon,
    BookOpen,
    Plus,
    Loader2
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { DynamicQuestionBuilder } from "./dynamic-question-builder"

// Types
export type AgentRole = "sales" | "lead_qualification" | "support" | "info_consultant"

export interface QuizAnswers {
    // Step 1 - Role
    role: AgentRole | ""

    // Sales-specific
    salesCta: string
    salesCtaCustom: string
    salesPersistence: string
    salesPersistenceCustom: string

    // Lead Qualification-specific
    leadFilter: string
    leadFilterCustom: string
    leadStrategy: string
    leadStrategyCustom: string
    surveyQuestions: string[]

    // Support-specific
    supportEmpathy: string
    supportEmpathyCustom: string
    supportLanguage: string
    supportLanguageCustom: string

    // Info Consultant-specific
    infoInterpretation: string
    infoInterpretationCustom: string
    infoOfftopic: string
    infoOfftopicCustom: string

    // Global settings
    toneOfVoice: string
    toneOfVoiceCustom: string
    responseLength: string
    responseLengthCustom: string
    fallback: string
    fallbackCustom: string

    // Constraints (taboo)
    constraints: string[]
    customConstraints: string[]
}

export const initialQuizAnswers: QuizAnswers = {
    role: "",
    salesCta: "",
    salesCtaCustom: "",
    salesPersistence: "",
    salesPersistenceCustom: "",
    leadFilter: "",
    leadFilterCustom: "",
    leadStrategy: "",
    leadStrategyCustom: "",
    surveyQuestions: [],
    supportEmpathy: "",
    supportEmpathyCustom: "",
    supportLanguage: "",
    supportLanguageCustom: "",
    infoInterpretation: "",
    infoInterpretationCustom: "",
    infoOfftopic: "",
    infoOfftopicCustom: "",
    toneOfVoice: "",
    toneOfVoiceCustom: "",
    responseLength: "",
    responseLengthCustom: "",
    fallback: "",
    fallbackCustom: "",
    constraints: [],
    customConstraints: [],
}

// Role cards data
const roles = [
    { id: "sales", icon: ShoppingCart, title: "Активные продажи", desc: "Закрытие сделок, дожим клиентов" },
    { id: "lead_qualification", icon: UserCheck, title: "Квалификация лида", desc: "Сбор данных, фильтрация" },
    { id: "support", icon: HeadphonesIcon, title: "Техподдержка", desc: "Решение проблем, помощь" },
    { id: "info_consultant", icon: BookOpen, title: "Инфо-консультант", desc: "Ответы по базе знаний" },
] as const

// Option component with custom input
interface OptionWithCustomProps {
    label: string
    value: string
    options: { value: string; label: string }[]
    customValue: string
    onChange: (value: string) => void
    onCustomChange: (value: string) => void
}

function OptionWithCustom({ label, value, options, customValue, onChange, onCustomChange }: OptionWithCustomProps) {
    const isCustom = value === "custom"

    return (
        <div className="space-y-3">
            <Label className="text-sm font-medium">{label}</Label>
            <RadioGroup value={value} onValueChange={onChange} className="space-y-2">
                {options.map((opt) => (
                    <div key={opt.value} className="flex items-center space-x-2">
                        <RadioGroupItem value={opt.value} id={`${label}-${opt.value}`} />
                        <Label htmlFor={`${label}-${opt.value}`} className="text-sm font-normal cursor-pointer">
                            {opt.label}
                        </Label>
                    </div>
                ))}
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="custom" id={`${label}-custom`} />
                    <Label htmlFor={`${label}-custom`} className="text-sm font-normal cursor-pointer">
                        + Свой вариант
                    </Label>
                </div>
            </RadioGroup>

            <AnimatePresence>
                {isCustom && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                    >
                        <Input
                            value={customValue}
                            onChange={(e) => onCustomChange(e.target.value)}
                            placeholder="Введите свой вариант..."
                            className="mt-2"
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

// Constraint option
const defaultConstraints = [
    { id: "no_swearing", label: "Не материться" },
    { id: "no_prices", label: "Не называть цены" },
    { id: "no_competitors", label: "Не обсуждать конкурентов" },
    { id: "no_hallucination", label: "Не галлюцинировать" },
]

interface SmartQuizStepProps {
    answers: QuizAnswers
    onChange: (answers: QuizAnswers) => void
    isGenerating?: boolean
}

export function SmartQuizStep({ answers, onChange, isGenerating }: SmartQuizStepProps) {
    const [customConstraintInput, setCustomConstraintInput] = React.useState("")

    const updateAnswer = <K extends keyof QuizAnswers>(key: K, value: QuizAnswers[K]) => {
        onChange({ ...answers, [key]: value })
    }

    const addCustomConstraint = () => {
        if (customConstraintInput.trim()) {
            updateAnswer("customConstraints", [...answers.customConstraints, customConstraintInput.trim()])
            setCustomConstraintInput("")
        }
    }

    const removeCustomConstraint = (index: number) => {
        updateAnswer("customConstraints", answers.customConstraints.filter((_, i) => i !== index))
    }

    const toggleConstraint = (id: string) => {
        if (answers.constraints.includes(id)) {
            updateAnswer("constraints", answers.constraints.filter(c => c !== id))
        } else {
            updateAnswer("constraints", [...answers.constraints, id])
        }
    }

    return (
        <div className="space-y-8">
            {/* Role Selection */}
            <div className="space-y-4">
                <Label className="text-base font-semibold">Выберите роль агента</Label>
                <div className="grid grid-cols-2 gap-3">
                    {roles.map((role) => (
                        <div
                            key={role.id}
                            onClick={() => updateAnswer("role", role.id as AgentRole)}
                            className={cn(
                                "relative flex cursor-pointer flex-col gap-2 rounded-xl border p-4 transition-all hover:border-primary/50",
                                answers.role === role.id && "border-primary bg-primary/5 ring-1 ring-primary"
                            )}
                        >
                            <div className={cn(
                                "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                                answers.role === role.id
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground"
                            )}>
                                <role.icon className="h-5 w-5" />
                            </div>
                            <div>
                                <h4 className="font-medium text-sm">{role.title}</h4>
                                <p className="text-xs text-muted-foreground">{role.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Role-specific questions */}
            <AnimatePresence mode="wait">
                {answers.role === "sales" && (
                    <motion.div
                        key="sales"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-6 rounded-lg border bg-muted/30 p-4"
                    >
                        <h4 className="font-medium flex items-center gap-2">
                            <ShoppingCart className="h-4 w-4" /> Настройки продаж
                        </h4>

                        <OptionWithCustom
                            label="Целевое действие (CTA)"
                            value={answers.salesCta}
                            customValue={answers.salesCtaCustom}
                            onChange={(v) => updateAnswer("salesCta", v)}
                            onCustomChange={(v) => updateAnswer("salesCtaCustom", v)}
                            options={[
                                { value: "meeting", label: "Запись на встречу" },
                                { value: "payment", label: "Оплата / Ссылка на чек" },
                                { value: "phone", label: "Сбор телефона" },
                            ]}
                        />

                        <OptionWithCustom
                            label="Уровень настойчивости"
                            value={answers.salesPersistence}
                            customValue={answers.salesPersistenceCustom}
                            onChange={(v) => updateAnswer("salesPersistence", v)}
                            onCustomChange={(v) => updateAnswer("salesPersistenceCustom", v)}
                            options={[
                                { value: "aggressive", label: "Агрессивный дожим" },
                                { value: "consultative", label: "Консультативный (мягко)" },
                                { value: "passive", label: "Пассивный (только ответы)" },
                            ]}
                        />
                    </motion.div>
                )}

                {answers.role === "lead_qualification" && (
                    <motion.div
                        key="lead"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-6 rounded-lg border bg-muted/30 p-4"
                    >
                        <h4 className="font-medium flex items-center gap-2">
                            <UserCheck className="h-4 w-4" /> Настройки квалификации
                        </h4>

                        <OptionWithCustom
                            label="Жесткость фильтра"
                            value={answers.leadFilter}
                            customValue={answers.leadFilterCustom}
                            onChange={(v) => updateAnswer("leadFilter", v)}
                            onCustomChange={(v) => updateAnswer("leadFilterCustom", v)}
                            options={[
                                { value: "vacuum", label: "Пылесос (собирать всех)" },
                                { value: "sniper", label: "Снайпер (отсеивать нецелевых)" },
                            ]}
                        />

                        <OptionWithCustom
                            label="Стиль сбора данных"
                            value={answers.leadStrategy}
                            customValue={answers.leadStrategyCustom}
                            onChange={(v) => updateAnswer("leadStrategy", v)}
                            onCustomChange={(v) => updateAnswer("leadStrategyCustom", v)}
                            options={[
                                { value: "native", label: "Нативная беседа" },
                                { value: "survey", label: "Анкетирование (строго по списку)" },
                            ]}
                        />

                        {answers.leadStrategy === "survey" && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                            >
                                <DynamicQuestionBuilder
                                    questions={answers.surveyQuestions}
                                    onChange={(q) => updateAnswer("surveyQuestions", q)}
                                />
                            </motion.div>
                        )}
                    </motion.div>
                )}

                {answers.role === "support" && (
                    <motion.div
                        key="support"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-6 rounded-lg border bg-muted/30 p-4"
                    >
                        <h4 className="font-medium flex items-center gap-2">
                            <HeadphonesIcon className="h-4 w-4" /> Настройки поддержки
                        </h4>

                        <OptionWithCustom
                            label="Уровень эмпатии"
                            value={answers.supportEmpathy}
                            customValue={answers.supportEmpathyCustom}
                            onChange={(v) => updateAnswer("supportEmpathy", v)}
                            onCustomChange={(v) => updateAnswer("supportEmpathyCustom", v)}
                            options={[
                                { value: "maximum", label: "Максимальная забота (психолог)" },
                                { value: "professional", label: "Сухой профи (только факты)" },
                            ]}
                        />

                        <OptionWithCustom
                            label="Сложность языка"
                            value={answers.supportLanguage}
                            customValue={answers.supportLanguageCustom}
                            onChange={(v) => updateAnswer("supportLanguage", v)}
                            onCustomChange={(v) => updateAnswer("supportLanguageCustom", v)}
                            options={[
                                { value: "beginner", label: 'Для новичков ("на пальцах")' },
                                { value: "expert", label: "Для профи (термины)" },
                            ]}
                        />
                    </motion.div>
                )}

                {answers.role === "info_consultant" && (
                    <motion.div
                        key="info"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-6 rounded-lg border bg-muted/30 p-4"
                    >
                        <h4 className="font-medium flex items-center gap-2">
                            <BookOpen className="h-4 w-4" /> Настройки консультанта
                        </h4>

                        <OptionWithCustom
                            label="Интерпретация информации"
                            value={answers.infoInterpretation}
                            customValue={answers.infoInterpretationCustom}
                            onChange={(v) => updateAnswer("infoInterpretation", v)}
                            onCustomChange={(v) => updateAnswer("infoInterpretationCustom", v)}
                            options={[
                                { value: "strict", label: "Строгий цитатник (только база)" },
                                { value: "analyst", label: "Аналитик (обобщение и выводы)" },
                            ]}
                        />

                        <OptionWithCustom
                            label="Реакция на офтоп"
                            value={answers.infoOfftopic}
                            customValue={answers.infoOfftopicCustom}
                            onChange={(v) => updateAnswer("infoOfftopic", v)}
                            onCustomChange={(v) => updateAnswer("infoOfftopicCustom", v)}
                            options={[
                                { value: "ignore", label: "Игнорировать" },
                                { value: "polite", label: "Поддержать беседу вежливо" },
                            ]}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Global Settings - show only when role is selected */}
            {answers.role && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-6"
                >
                    <h4 className="font-semibold text-base border-t pt-6">Глобальные настройки</h4>

                    <div className="grid md:grid-cols-2 gap-6">
                        <OptionWithCustom
                            label="Tone of Voice"
                            value={answers.toneOfVoice}
                            customValue={answers.toneOfVoiceCustom}
                            onChange={(v) => updateAnswer("toneOfVoice", v)}
                            onCustomChange={(v) => updateAnswer("toneOfVoiceCustom", v)}
                            options={[
                                { value: "official", label: "Официальный" },
                                { value: "friendly", label: "Дружелюбный" },
                                { value: "casual", label: "Свой в доску" },
                            ]}
                        />

                        <OptionWithCustom
                            label="Длина ответов"
                            value={answers.responseLength}
                            customValue={answers.responseLengthCustom}
                            onChange={(v) => updateAnswer("responseLength", v)}
                            onCustomChange={(v) => updateAnswer("responseLengthCustom", v)}
                            options={[
                                { value: "concise", label: "Лаконично" },
                                { value: "balanced", label: "Сбалансировано" },
                                { value: "detailed", label: "Детально" },
                            ]}
                        />
                    </div>

                    <OptionWithCustom
                        label="Если нет информации (Fallback)"
                        value={answers.fallback}
                        customValue={answers.fallbackCustom}
                        onChange={(v) => updateAnswer("fallback", v)}
                        onCustomChange={(v) => updateAnswer("fallbackCustom", v)}
                        options={[
                            { value: "admit", label: 'Сказать "Не знаю"' },
                            { value: "contact", label: "Взять контакт для связи" },
                            { value: "guess", label: "Додумать (осторожно!)" },
                        ]}
                    />

                    {/* Constraints / Taboo */}
                    <div className="space-y-4">
                        <Label className="text-sm font-medium">Табу (ограничения)</Label>
                        <div className="space-y-3">
                            {defaultConstraints.map((constraint) => (
                                <div key={constraint.id} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={constraint.id}
                                        checked={answers.constraints.includes(constraint.id)}
                                        onCheckedChange={() => toggleConstraint(constraint.id)}
                                    />
                                    <Label htmlFor={constraint.id} className="text-sm font-normal cursor-pointer">
                                        {constraint.label}
                                    </Label>
                                </div>
                            ))}

                            {/* Custom constraints */}
                            {answers.customConstraints.map((constraint, i) => (
                                <div key={`custom-${i}`} className="flex items-center space-x-2">
                                    <Checkbox checked disabled />
                                    <span className="text-sm flex-1">{constraint}</span>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={() => removeCustomConstraint(i)}
                                    >
                                        ×
                                    </Button>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-2">
                            <Input
                                value={customConstraintInput}
                                onChange={(e) => setCustomConstraintInput(e.target.value)}
                                placeholder="Добавить своё ограничение..."
                                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomConstraint())}
                            />
                            <Button type="button" variant="outline" size="icon" onClick={addCustomConstraint}>
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </motion.div>
            )}

            {isGenerating && (
                <div className="flex items-center justify-center py-8 gap-3 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Генерация инструкции с помощью Claude...</span>
                </div>
            )}
        </div>
    )
}
