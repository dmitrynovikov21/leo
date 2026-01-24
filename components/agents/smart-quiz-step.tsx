"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    TrendingUp,
    Filter,
    MessageSquare,
    FileText,
    Plus,
    Loader2,
    Check
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { DynamicQuestionBuilder } from "./dynamic-question-builder"

// Types
export type AgentRole = "corporate_bot" | "sales" | "lead_qualification" | "support"

export interface QuizAnswers {
    // Step 1 - Role
    role: AgentRole | ""

    // Corporate Bot Details (New)
    identityName: string
    identityPosition: string
    audience: string
    audienceCustom: string
    strictness: string
    strictnessCustom: string
    citations: string
    citationsCustom: string
    conflicts: string
    conflictsCustom: string
    answerDepth: string
    answerDepthCustom: string
    format: string
    formatCustom: string
    fallback: string
    fallbackCustom: string
    fewShot: string

    // Legacy / Other Roles (Optional/Reserved)
    salesCta?: string
    salesCtaCustom?: string
    salesPersistence?: string
    salesPersistenceCustom?: string
    leadFilter?: string
    leadFilterCustom?: string
    leadStrategy?: string
    leadStrategyCustom?: string
    surveyQuestions?: string[]
    supportEmpathy?: string
    supportEmpathyCustom?: string
    supportLanguage?: string
    supportLanguageCustom?: string
    infoInterpretation?: string
    infoInterpretationCustom?: string
    infoOfftopic?: string
    infoOfftopicCustom?: string
    toneOfVoice?: string
    toneOfVoiceCustom?: string
    responseLength?: string
    responseLengthCustom?: string

    // Constraints (taboo)
    constraints: string[]
    customConstraints: string[]
}

export const initialQuizAnswers: QuizAnswers = {
    role: "corporate_bot", // Default to Corporate Bot
    identityName: "",
    identityPosition: "",
    audience: "",
    audienceCustom: "",
    strictness: "",
    strictnessCustom: "",
    citations: "",
    citationsCustom: "",
    conflicts: "",
    conflictsCustom: "",
    answerDepth: "",
    answerDepthCustom: "",
    format: "",
    formatCustom: "",
    fallback: "",
    fallbackCustom: "",
    fewShot: "",

    // Legacy
    constraints: [],
    customConstraints: [],
}

// Role cards data
const roles = [
    { id: "sales", icon: TrendingUp, title: "Активные продажи", desc: "Закрытие сделок, дожим клиентов" },
    { id: "lead_qualification", icon: Filter, title: "Квалификация лида", desc: "Сбор данных, фильтрация" },
    { id: "support", icon: MessageSquare, title: "Техподдержка", desc: "Решение проблем, помощь" },
    { id: "info_consultant", icon: FileText, title: "Инфо-консультант", desc: "Ответы по базе знаний" },
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
            <Label className="text-sm font-medium text-foreground">{label}</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {options.map((opt) => {
                    const isActive = value === opt.value
                    return (
                        <div
                            key={opt.value}
                            onClick={() => onChange(opt.value)}
                            className={cn(
                                "cursor-pointer rounded-lg border p-3 transition-all hover:bg-accent hover:text-accent-foreground",
                                isActive
                                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                                    : "bg-card"
                            )}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">{opt.label}</span>
                                {isActive && <Check className="h-4 w-4 text-primary" />}
                            </div>
                        </div>
                    )
                })}

                {/* Custom Option Card */}
                <div
                    onClick={() => onChange("custom")}
                    className={cn(
                        "cursor-pointer rounded-lg border p-3 transition-all hover:bg-accent hover:text-accent-foreground",
                        isCustom
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "bg-card"
                    )}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">+ Свой вариант</span>
                        {isCustom && <Check className="h-4 w-4 text-primary" />}
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {isCustom && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <Input
                            value={customValue}
                            onChange={(e) => onCustomChange(e.target.value)}
                            placeholder="Введите свой вариант..."
                            className="mt-2"
                            autoFocus
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
                    {/* Active Corporate Bot Role */}
                    <div
                        onClick={() => updateAnswer("role", "corporate_bot")}
                        className={cn(
                            "relative flex cursor-pointer flex-col gap-2 rounded-xl border p-4 transition-all hover:border-primary/50",
                            answers.role === "corporate_bot"
                                ? "border-primary bg-primary/5 ring-1 ring-primary"
                                : "bg-card"
                        )}
                    >
                        <div className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                            answers.role === "corporate_bot"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                        )}>
                            <FileText className="h-5 w-5" />
                        </div>
                        <div>
                            <h4 className="font-medium text-sm">Корпоративный бот</h4>
                            <p className="text-xs text-muted-foreground">База знаний, онбординг, инструкции</p>
                        </div>
                    </div>

                    {/* Disabled Roles */}
                    {[
                        { id: "sales", icon: TrendingUp, title: "Активные продажи", desc: "Закрытие сделок" },
                        { id: "lead_qualification", icon: Filter, title: "Квалификация", desc: "Сбор лидов" },
                        { id: "support", icon: MessageSquare, title: "Техподдержка", desc: "Решение проблем" },
                    ].map((role) => (
                        <div
                            key={role.id}
                            className="relative flex flex-col gap-2 rounded-xl border p-4 opacity-50 cursor-not-allowed bg-muted/20"
                        >
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                <role.icon className="h-5 w-5" />
                            </div>
                            <div>
                                <h4 className="font-medium text-sm">{role.title}</h4>
                                <p className="text-xs text-muted-foreground">{role.desc}</p>
                            </div>
                            <div className="absolute top-2 right-2 rounded bg-muted px-2 py-0.5 text-[10px] uppercase font-medium text-muted-foreground">
                                Soon
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Questions for Corporate Bot */}
            <AnimatePresence mode="wait">
                {answers.role === "corporate_bot" && (
                    <motion.div
                        key="corporate"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-8 rounded-lg border bg-muted/10 p-6"
                    >
                        {/* 1. Identity */}
                        <div className="space-y-4">
                            <h4 className="font-medium flex items-center gap-2 text-primary">
                                <FileText className="h-4 w-4" /> 1. Личность (Identity)
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Имя ассистента</Label>
                                    <Input
                                        placeholder="Например: Олег"
                                        value={answers.identityName}
                                        onChange={(e) => updateAnswer("identityName", e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Должность</Label>
                                    <Input
                                        placeholder="Например: Менеджер знаний"
                                        value={answers.identityPosition}
                                        onChange={(e) => updateAnswer("identityPosition", e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 2. Audience */}
                        <OptionWithCustom
                            label="2. Целевая аудитория (Audience)"
                            value={answers.audience}
                            customValue={answers.audienceCustom}
                            onChange={(v) => updateAnswer("audience", v)}
                            onCustomChange={(v) => updateAnswer("audienceCustom", v)}
                            options={[
                                { value: "clients", label: "Клиенты (внешние)" },
                                { value: "employees", label: "Сотрудники (внутренние)" },
                                { value: "management", label: "Руководство" },
                            ]}
                        />

                        {/* 3. Strictness */}
                        <OptionWithCustom
                            label="3. Источник знаний (Strictness)"
                            value={answers.strictness}
                            customValue={answers.strictnessCustom}
                            onChange={(v) => updateAnswer("strictness", v)}
                            onCustomChange={(v) => updateAnswer("strictnessCustom", v)}
                            options={[
                                { value: "strict_files", label: "Только из файлов (Strict)" },
                                { value: "hybrid", label: "Файлы + знания модели" },
                            ]}
                        />

                        {/* 4. Citations */}
                        <OptionWithCustom
                            label="4. Ссылки на источники (Citations)"
                            value={answers.citations}
                            customValue={answers.citationsCustom}
                            onChange={(v) => updateAnswer("citations", v)}
                            onCustomChange={(v) => updateAnswer("citationsCustom", v)}
                            options={[
                                { value: "always", label: "Обязательно в каждом ответе" },
                                { value: "on_request", label: "Только если попросят" },
                                { value: "hidden", label: "Скрыто" },
                            ]}
                        />

                        {/* 5. Conflicts */}
                        <OptionWithCustom
                            label="5. Противоречия в данных (Conflicts)"
                            value={answers.conflicts}
                            customValue={answers.conflictsCustom}
                            onChange={(v) => updateAnswer("conflicts", v)}
                            onCustomChange={(v) => updateAnswer("conflictsCustom", v)}
                            options={[
                                { value: "latest", label: "Верить самому свежему файлу" },
                                { value: "detailed", label: "Верить самому подробному" },
                                { value: "report", label: "Сообщить о конфликте" },
                            ]}
                        />

                        {/* 6. Answer Depth */}
                        <OptionWithCustom
                            label="6. Глубина ответа (Depth)"
                            value={answers.answerDepth}
                            customValue={answers.answerDepthCustom}
                            onChange={(v) => updateAnswer("answerDepth", v)}
                            onCustomChange={(v) => updateAnswer("answerDepthCustom", v)}
                            options={[
                                { value: "concise", label: "Лаконичный" },
                                { value: "step_by_step", label: "Пошаговый инструктор" },
                                { value: "expert", label: "Собеседник-эксперт" },
                            ]}
                        />

                        {/* 7. Format */}
                        <OptionWithCustom
                            label="7. Стиль оформления (Format)"
                            value={answers.format}
                            customValue={answers.formatCustom}
                            onChange={(v) => updateAnswer("format", v)}
                            onCustomChange={(v) => updateAnswer("formatCustom", v)}
                            options={[
                                { value: "rich", label: "Списки и жирный шрифт" },
                                { value: "plain", label: "Простой текст" },
                            ]}
                        />

                        {/* 8. Fallback */}
                        <OptionWithCustom
                            label="8. Если нет ответа (Fallback)"
                            value={answers.fallback}
                            customValue={answers.fallbackCustom}
                            onChange={(v) => updateAnswer("fallback", v)}
                            onCustomChange={(v) => updateAnswer("fallbackCustom", v)}
                            options={[
                                { value: "contact", label: "Попросить контакт для связи" },
                                { value: "manager", label: "Перевести на менеджера" },
                                { value: "no_info", label: 'Сказать "Информации нет"' },
                            ]}
                        />

                        {/* 9. Few-shot */}
                        <div className="space-y-3">
                            <Label className="text-sm font-medium text-foreground">9. Эталонный пример (Few-shot)</Label>
                            <p className="text-xs text-muted-foreground">
                                Приведите пример идеального диалога. Формат: "Вопрос — Ответ".
                            </p>
                            <textarea
                                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="User: Как оформить отпуск?
Agent: Для оформления отпуска нужно:
1. Зайти на портал...
2. Заполнить форму..."
                                value={answers.fewShot}
                                onChange={(e) => updateAnswer("fewShot", e.target.value)}
                            />
                        </div>

                    </motion.div>
                )}
            </AnimatePresence>

            {isGenerating && (
                <div className="flex items-center justify-center py-8 gap-3 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Генерация инструкции с помощью Claude...</span>
                </div>
            )}
        </div>
    )
}
