"use client"

import * as React from "react"
import { Save, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"

interface TableEditorDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    file: any
    onSave: (fileId: string, data: any[][]) => void
}

export function TableEditorDialog({
    open,
    onOpenChange,
    file,
    onSave,
}: TableEditorDialogProps) {
    // Mock initial data - 10 rows x 5 columns
    const initialData = Array(20).fill(0).map((_, row) =>
        Array(6).fill(0).map((_, col) =>
            row === 0 ? `Header ${col + 1}` : `Cell ${row}-${col}`
        )
    )

    const [data, setData] = React.useState<string[][]>(initialData)

    React.useEffect(() => {
        if (open) {
            // Reset or load data when opened
            setData(initialData)
        }
    }, [open])

    const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
        const newData = [...data]
        newData[rowIndex] = [...newData[rowIndex]]
        newData[rowIndex][colIndex] = value
        setData(newData)
    }

    if (!file) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[90vw] h-[80vh] flex flex-col p-0 gap-0 sm:rounded-xl overflow-hidden bg-[#f8f9fc] dark:bg-[#09090b]">
                <div className="flex items-center justify-between px-6 py-4 border-b bg-background/50 backdrop-blur-sm z-10">
                    <div className="flex flex-col gap-1">
                        <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
                            {file.name}
                        </DialogTitle>
                        <DialogDescription>
                            Редактор таблиц • {data.length} строк • {data[0]?.length} столбцов
                        </DialogDescription>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden relative bg-card dark:bg-zinc-950">
                    <ScrollArea className="h-full w-full">
                        <div className="min-w-max p-4">
                            <div className="border rounded-md overflow-hidden bg-background shadow-sm">
                                <table className="w-full border-collapse text-sm">
                                    <thead>
                                        <tr>
                                            <th className="w-10 bg-muted/50 border-b border-r p-2 text-center text-xs text-muted-foreground select-none">
                                                #
                                            </th>
                                            {data[0]?.map((_, colIndex) => (
                                                <th key={colIndex} className="min-w-[120px] bg-muted/30 border-b border-r last:border-r-0 p-2 text-left font-medium text-muted-foreground select-none">
                                                    {String.fromCharCode(65 + colIndex)}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.map((row, rowIndex) => (
                                            <tr key={rowIndex} className="group">
                                                <td className="bg-muted/50 border-b border-r p-2 text-center text-xs text-muted-foreground select-none group-hover:bg-muted/70 transition-colors">
                                                    {rowIndex + 1}
                                                </td>
                                                {row.map((cell, colIndex) => (
                                                    <td key={colIndex} className="border-b border-r last:border-r-0 p-0 min-w-[120px]">
                                                        <input
                                                            className="w-full h-full px-3 py-2 bg-transparent border-0 focus:ring-2 focus:ring-inset focus:ring-primary/20 outline-none text-foreground transition-all"
                                                            value={cell}
                                                            onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                                                        />
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                </div>

                <DialogFooter className="p-4 border-t bg-background/50 backdrop-blur-sm">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Отмена
                    </Button>
                    <Button onClick={() => onSave(file.id, data)} className="gap-2">
                        <Save className="h-4 w-4" />
                        Сохранить
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
