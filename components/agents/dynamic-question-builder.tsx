"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Trash2, Lightbulb, GripVertical } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface DynamicQuestionBuilderProps {
    questions: string[]
    onChange: (questions: string[]) => void
}

export function DynamicQuestionBuilder({ questions, onChange }: DynamicQuestionBuilderProps) {
    const addQuestion = () => {
        onChange([...questions, ""])
    }

    const updateQuestion = (index: number, value: string) => {
        const updated = [...questions]
        updated[index] = value
        onChange(updated)
    }

    const removeQuestion = (index: number) => {
        onChange(questions.filter((_, i) => i !== index))
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <Label className="text-sm font-medium">Вопросы для анкетирования</Label>
            </div>

            <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                    {questions.map((question, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="flex items-center gap-2"
                        >
                            <div className="flex items-center justify-center w-6 h-6 rounded bg-muted text-xs font-medium text-muted-foreground">
                                {index + 1}
                            </div>
                            <Input
                                value={question}
                                onChange={(e) => updateQuestion(index, e.target.value)}
                                placeholder={`Вопрос ${index + 1}...`}
                                className="flex-1"
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => removeQuestion(index)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addQuestion}
                className="w-full"
            >
                <Plus className="mr-2 h-4 w-4" />
                Добавить вопрос
            </Button>

            {questions.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                    Добавьте вопросы, которые агент будет задавать клиентам
                </p>
            )}
        </div>
    )
}
