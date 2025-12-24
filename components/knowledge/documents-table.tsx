"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { FileText, MoreHorizontal, File, AlertCircle, CheckCircle2, Loader2, Eye, Trash2, Sheet, Search, Folder } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

import { mockDocuments, type Document } from "@/mocks/documents"
import { cn } from "@/lib/utils"

interface DocumentsTableProps {
    onInspect?: (doc: Document) => void
    onRowClick?: (doc: Document) => void
    onDelete?: (doc: Document) => void
    docs?: Document[]
}

export function DocumentsTable({ onInspect, onRowClick, onDelete, docs }: DocumentsTableProps) {
    const t = useTranslations('Knowledge');
    const tCommon = useTranslations('Common');

    // Use passed docs or default to all unique logic if not provided (fallback)
    const documents = docs || mockDocuments

    return (
        <div className="rounded-2xl border border-zinc-200/50 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow className="hover:bg-transparent border-zinc-100">
                        <TableHead className="w-[30%] text-zinc-500 font-medium">Название</TableHead>
                        <TableHead className="text-zinc-500 font-medium">Тип</TableHead>
                        <TableHead className="text-zinc-500 font-medium">Размер</TableHead>
                        <TableHead className="text-zinc-500 font-medium">Статус</TableHead>
                        <TableHead className="text-right text-zinc-500 font-medium">Действия</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {documents.map((doc) => (
                        <TableRow
                            key={doc.id}
                            className={cn("group cursor-pointer hover:bg-zinc-50/80 transition-colors border-zinc-100", onRowClick && "cursor-pointer")}
                            onClick={() => onRowClick?.(doc)}
                        >
                            <TableCell className="font-medium">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "p-2.5 rounded-xl bg-transparent text-zinc-500 group-hover:bg-white group-hover:shadow-sm transition-all border border-transparent group-hover:border-zinc-200/50"
                                    )}>
                                        {doc.type === 'spreadsheet' ? <Sheet size={16} /> : doc.type === 'folder' ? <Folder size={16} fill="currentColor" className="opacity-50" /> : <FileText size={16} />}
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-sm font-semibold text-zinc-900">{doc.name}</span>
                                        <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium">{doc.updatedAt}</span>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>
                                {doc.type === 'spreadsheet' ? (
                                    <Badge variant="outline" className="text-xs font-medium text-green-700 bg-green-50 border-green-200 rounded-lg px-2 py-0.5 shadow-none">
                                        Таблица
                                    </Badge>
                                ) : doc.type === 'folder' ? (
                                    <Badge variant="outline" className="text-xs font-medium text-blue-700 bg-blue-50 border-blue-200 rounded-lg px-2 py-0.5 shadow-none">
                                        Папка
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="text-xs font-medium text-zinc-600 bg-zinc-100 border-zinc-200 rounded-lg px-2 py-0.5 shadow-none">
                                        {doc.type}
                                    </Badge>
                                )}
                            </TableCell>
                            <TableCell className="text-zinc-500 text-sm font-mono">{doc.size}</TableCell>
                            <TableCell>
                                <Badge variant={(doc.status === 'ready' || doc.status === 'vectorized') ? 'default' : 'secondary'} className={cn(
                                    "rounded-lg px-2 py-0.5 font-medium text-xs shadow-none border",
                                    (doc.status === 'ready' || doc.status === 'vectorized') ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                                )}>
                                    {(doc.status === 'ready' || doc.status === 'vectorized') ? 'Индексирован' : 'Обработка'}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-900">
                                            <span className="sr-only">Действия</span>
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="rounded-xl border-zinc-200 shadow-lg">
                                        <DropdownMenuLabel>Действия</DropdownMenuLabel>
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onInspect?.(doc) }} className="rounded-lg">
                                            <Search className="mr-2 h-4 w-4" />
                                            Просмотр
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onClick={(e) => { e.stopPropagation(); onDelete?.(doc) }}
                                            className="text-red-600 rounded-lg focus:bg-red-50 focus:text-red-700"
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Удалить
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
