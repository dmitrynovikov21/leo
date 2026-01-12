"use client"

import * as React from "react"
import { Save, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

export interface Note {
    id: number | string
    title: string
    content: string
}

interface NoteEditorDialogProps {
    trigger?: React.ReactNode
    note?: Note
    open?: boolean
    onOpenChange?: (open: boolean) => void
    onSave: (note: Partial<Note>) => void
    onDelete?: (id: number | string) => void
    mode: 'create' | 'edit'
}

export function NoteEditorDialog({
    trigger,
    note,
    open,
    onOpenChange,
    onSave,
    onDelete,
    mode
}: NoteEditorDialogProps) {
    const [title, setTitle] = React.useState(note?.title || "")
    const [content, setContent] = React.useState(note?.content || "")

    // Reset form when opening in create mode or changing note
    React.useEffect(() => {
        if (open) {
            setTitle(note?.title || "")
            setContent(note?.content || "")
        }
    }, [open, note])

    const handleSave = () => {
        if (!title.trim()) {
            toast.error("Заголовок обязателен")
            return
        }
        onSave({ ...note, title, content })
        onOpenChange?.(false)
        toast.success(mode === 'create' ? "Заметка создана" : "Заметка обновлена")
    }

    const handleDelete = () => {
        if (note?.id) {
            onDelete?.(note.id)
            onOpenChange?.(false)
            toast.success("Заметка удалена")
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="sm:max-w-[600px] h-[70vh] flex flex-col p-0 gap-0 sm:rounded-xl overflow-hidden bg-[#fafafa] dark:bg-[#09090b]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b bg-background/50 backdrop-blur-sm z-10">
                    <div className="flex flex-col gap-1">
                        <DialogTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                            {mode === 'create' ? 'Создать заметку' : 'Редактировать заметку'}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            {mode === 'create'
                                ? 'Добавьте важную информацию, которую агент должен знать.'
                                : 'Измените содержание этой основной заметки.'}
                        </DialogDescription>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 p-6 overflow-y-auto bg-white dark:bg-zinc-950 flex flex-col gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="title" className="text-sm font-medium text-zinc-700 ml-1">Заголовок</Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="например, Политика отпусков 2025"
                            className="h-11 rounded-xl border-transparent bg-zinc-100/50 focus:bg-white focus:ring-2 focus:ring-zinc-200 transition-all font-medium text-zinc-900 px-4 placeholder:text-zinc-400 text-base"
                        />
                    </div>

                    <div className="flex-1 flex flex-col gap-2 min-h-0">
                        <Label htmlFor="content" className="text-sm font-medium text-zinc-700 ml-1">Содержание</Label>
                        <Textarea
                            id="content"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Введите текст заметки здесь..."
                            className="flex-1 resize-none rounded-xl border-transparent bg-zinc-100/50 focus:bg-white focus:ring-2 focus:ring-zinc-200 transition-all font-medium text-zinc-900 p-4 text-base leading-relaxed placeholder:text-zinc-400"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center p-4 border-t bg-background/50 backdrop-blur-sm">
                    <div>
                        {mode === 'edit' && onDelete && (
                            <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                    onDelete(note.id)
                                    onOpenChange(false)
                                }}
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Удалить
                            </Button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={() => onOpenChange(false)}>
                            Отмена
                        </Button>
                        <Button onClick={handleSave} className="min-w-[100px]">
                            {mode === 'create' ? 'Создать' : 'Сохранить'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
