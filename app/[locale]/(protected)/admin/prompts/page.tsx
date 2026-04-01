"use client"

import * as React from "react"
import { toast } from "sonner"
import { Loader2, Pencil, Save, Sparkles, ToggleLeft, ToggleRight, Code, Info, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"

import {
    getSystemPrompts,
    updateSystemPrompt,
    seedDefaultPrompts,
    GlobalSystemPromptData
} from "@/actions/system-prompts"

export default function AdminPromptsPage() {
    const [prompts, setPrompts] = React.useState<GlobalSystemPromptData[]>([])
    const [isLoading, setIsLoading] = React.useState(true)
    const [isSeeding, setIsSeeding] = React.useState(false)
    const [isSaving, setIsSaving] = React.useState(false)

    // Dialog state
    const [isDialogOpen, setIsDialogOpen] = React.useState(false)
    const [editingPrompt, setEditingPrompt] = React.useState<GlobalSystemPromptData | null>(null)
    const [formData, setFormData] = React.useState({
        key: "",
        name: "",
        description: "",
        content: "",
        isActive: true
    })

    const loadPrompts = React.useCallback(async () => {
        try {
            const data = await getSystemPrompts()
            setPrompts(data)
        } catch (error) {
            console.error("Error loading prompts:", error)
            toast.error("Не удалось загрузить промпты")
        } finally {
            setIsLoading(false)
        }
    }, [])

    React.useEffect(() => {
        loadPrompts()
    }, [loadPrompts])

    const [isResettingCache, setIsResettingCache] = React.useState(false)

    const handleResetCache = async () => {
        setIsResettingCache(true)
        try {
            const res = await fetch(`/api/gateway/system-prompts/refresh`, {
                method: 'POST'
            })

            if (res.ok) {
                toast.success("Кеш промптов успешно сброшен")
            } else {
                throw new Error("Failed to refresh cache")
            }
        } catch (error) {
            console.error("Error resetting cache:", error)
            toast.error("Не удалось сбросить кеш")
        } finally {
            setIsResettingCache(false)
        }
    }

    const handleSeedDefaults = async () => {
        setIsSeeding(true)
        try {
            const result = await seedDefaultPrompts()
            if (result.created > 0) {
                toast.success(`Создано ${result.created} промптов по умолчанию`)
                loadPrompts()
            } else {
                toast.info("Все промпты по умолчанию уже существуют")
            }
        } catch (error) {
            console.error("Error seeding prompts:", error)
            toast.error("Не удалось создать промпты по умолчанию")
        } finally {
            setIsSeeding(false)
        }
    }

    const handleOpenEdit = (prompt: GlobalSystemPromptData) => {
        setEditingPrompt(prompt)
        setFormData({
            key: prompt.key,
            name: prompt.name,
            description: prompt.description || "",
            content: prompt.content,
            isActive: prompt.isActive
        })
        setIsDialogOpen(true)
    }

    const handleSave = async () => {
        if (!formData.name || !formData.content) {
            toast.error("Заполните все обязательные поля")
            return
        }

        if (!editingPrompt) {
            toast.error("Нет промпта для редактирования")
            return
        }

        setIsSaving(true)
        try {
            const result = await updateSystemPrompt(editingPrompt.id, {
                name: formData.name,
                description: formData.description,
                content: formData.content,
                isActive: formData.isActive
            })
            if (result.success) {
                toast.success("Промпт обновлён")
                setIsDialogOpen(false)
                loadPrompts()
            } else {
                toast.error(result.error || "Ошибка обновления")
            }
        } catch (error) {
            toast.error("Произошла ошибка")
        } finally {
            setIsSaving(false)
        }
    }

    const handleToggleActive = async (prompt: GlobalSystemPromptData) => {
        try {
            const result = await updateSystemPrompt(prompt.id, {
                isActive: !prompt.isActive
            })
            if (result.success) {
                toast.success(prompt.isActive ? "Промпт отключён" : "Промпт включён")
                loadPrompts()
            }
        } catch (error) {
            toast.error("Ошибка переключения")
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Системные промпты</h1>
                    <p className="text-muted-foreground">
                        Редактирование глобальных промптов для AI-генерации
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={handleResetCache}
                        disabled={isResettingCache}
                    >
                        {isResettingCache ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCw className="mr-2 h-4 w-4" />
                        )}
                        Сбросить кеш
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleSeedDefaults}
                        disabled={isSeeding}
                    >
                        {isSeeding ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Sparkles className="mr-2 h-4 w-4" />
                        )}
                        Добавить стандартные
                    </Button>
                </div>
            </div>

            {/* Prompts List */}
            {prompts.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <p className="text-muted-foreground mb-4">
                            Нет системных промптов
                        </p>
                        <Button variant="outline" onClick={handleSeedDefaults} disabled={isSeeding}>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Создать стандартные промпты
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {prompts.map((prompt) => (
                        <Card key={prompt.id} className={!prompt.isActive ? "opacity-60" : ""}>
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <CardTitle className="text-lg">{prompt.name}</CardTitle>
                                            <Badge variant={prompt.isActive ? "default" : "secondary"}>
                                                {prompt.isActive ? "Активен" : "Выключен"}
                                            </Badge>
                                        </div>
                                        <CardDescription className="font-mono text-xs">
                                            {prompt.key}
                                        </CardDescription>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleToggleActive(prompt)}
                                            title={prompt.isActive ? "Отключить" : "Включить"}
                                        >
                                            {prompt.isActive ? (
                                                <ToggleRight className="h-4 w-4 text-green-500" />
                                            ) : (
                                                <ToggleLeft className="h-4 w-4" />
                                            )}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleOpenEdit(prompt)}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {prompt.description && (
                                    <p className="text-sm text-muted-foreground">
                                        {prompt.description}
                                    </p>
                                )}
                                {prompt.usedIn && (
                                    <div className="flex items-start gap-2 rounded-md bg-blue-50 dark:bg-blue-950 p-2 text-xs">
                                        <Code className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                                        <div>
                                            <span className="font-medium text-blue-700 dark:text-blue-300">Используется в: </span>
                                            <span className="text-blue-600 dark:text-blue-400 font-mono">{prompt.usedIn}</span>
                                        </div>
                                    </div>
                                )}
                                <div className="rounded-md bg-muted p-3 font-mono text-xs text-muted-foreground max-h-32 overflow-hidden">
                                    {prompt.content.slice(0, 300)}
                                    {prompt.content.length > 300 && "..."}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
                    <DialogHeader className="shrink-0">
                        <DialogTitle>Редактировать промпт</DialogTitle>
                        <DialogDescription>
                            Измените содержимое системного промпта
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto pr-4 min-h-0">
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="key">Ключ</Label>
                                    <Input
                                        id="key"
                                        value={formData.key}
                                        disabled
                                        className="font-mono bg-muted"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Ключ нельзя изменить
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="name">Название *</Label>
                                    <Input
                                        id="name"
                                        placeholder="Шаблон создания агента"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Описание</Label>
                                <Input
                                    id="description"
                                    placeholder="Для чего используется этот промпт"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            {editingPrompt?.usedIn && (
                                <div className="flex items-start gap-2 rounded-md bg-blue-50 dark:bg-blue-950 p-3 text-sm">
                                    <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                                    <div>
                                        <span className="font-medium text-blue-700 dark:text-blue-300">Используется в: </span>
                                        <span className="text-blue-600 dark:text-blue-400 font-mono text-xs">{editingPrompt.usedIn}</span>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="content">Содержимое промпта *</Label>
                                <Textarea
                                    id="content"
                                    placeholder="Введите текст промпта..."
                                    value={formData.content}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                    className="min-h-[300px] font-mono text-sm"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Используйте {"{переменная}"} для подстановки данных
                                </p>
                            </div>

                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="isActive"
                                    checked={formData.isActive}
                                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                                />
                                <Label htmlFor="isActive">Активен</Label>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="shrink-0">
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                            Отмена
                        </Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="mr-2 h-4 w-4" />
                            )}
                            Сохранить
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
