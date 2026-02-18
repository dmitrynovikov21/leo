"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { FileText, MoreHorizontal, File, AlertCircle, CheckCircle2, Loader2, Eye, Trash2, Sheet, Search, Folder, Info } from "lucide-react"

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

import { mockDocuments, type Document, type AIMetadata } from "@/mocks/documents"
import { cn } from "@/lib/utils"
import { FilePassportModal } from "@/components/knowledge/file-passport-modal"

interface DocumentsTableProps {
    onInspect?: (doc: Document) => void
    onRowClick?: (doc: Document) => void
    onDelete?: (doc: Document) => void
    docs?: Document[]
}

export function DocumentsTable({ onInspect, onRowClick, onDelete, docs }: DocumentsTableProps) {
    const tCommon = useTranslations('Common');
    const t = useTranslations('Knowledge');

    // Modal state
    const [passportDoc, setPassportDoc] = React.useState<Document | null>(null);

    // Use passed docs or default to all unique logic if not provided (fallback)
    const documents = docs || mockDocuments

    // Handle description click to open passport modal
    const handleDescriptionClick = (e: React.MouseEvent, doc: Document) => {
        e.stopPropagation();
        if (doc.aiMetadata) {
            setPassportDoc(doc);
        }
    };


    return (
        <>
            {/* File Passport Modal */}
            <FilePassportModal
                open={!!passportDoc}
                onOpenChange={(open) => !open && setPassportDoc(null)}
                filename={passportDoc?.name || ''}
                metadata={passportDoc?.aiMetadata || null}
            />

            <div className="rounded-2xl border border-zinc-200/50 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent border-zinc-100">
                            <TableHead className="w-[25%] text-zinc-500 font-medium">Название</TableHead>
                            <TableHead className="text-zinc-500 font-medium">Тип</TableHead>
                            <TableHead className="text-zinc-500 font-medium">Размер</TableHead>
                            <TableHead className="text-zinc-500 font-medium">Статус</TableHead>
                            <TableHead className="w-[30%] text-zinc-500 font-medium">Описание</TableHead>
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
                                    <Badge variant={(doc.status === 'ready' || doc.status === 'vectorized') ? 'default' : doc.status === 'error' ? 'destructive' : 'secondary'} className={cn(
                                        "rounded-lg px-2 py-0.5 font-medium text-xs shadow-none border",
                                        (doc.status === 'ready' || doc.status === 'vectorized') && "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200",
                                        doc.status === 'error' && "bg-red-50 text-red-700 hover:bg-red-100 border-red-200",
                                        (doc.status === 'processing' || doc.status === 'pending') && "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                                    )}>
                                        {(doc.status === 'ready' || doc.status === 'vectorized') ? 'Индексирован' : doc.status === 'error' ? 'Ошибка' : 'Обработка...'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-sm max-w-[250px]">
                                    {doc.status === 'error' && doc.aiMetadata?.error ? (
                                        <span className="text-red-600 text-sm">
                                            {doc.aiMetadata.error}
                                        </span>
                                    ) : doc.aiMetadata?.summary ? (
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div
                                                        className="flex items-center gap-2 cursor-pointer hover:bg-zinc-100 rounded-lg p-1.5 -m-1.5 transition-colors group/desc"
                                                        onClick={(e) => handleDescriptionClick(e, doc)}
                                                    >
                                                        <span className="text-zinc-700 line-clamp-2 flex-1">
                                                            {doc.aiMetadata.summary}
                                                        </span>
                                                        <Info className="h-4 w-4 text-zinc-400 group-hover/desc:text-zinc-600 flex-shrink-0" />
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent side="top" className="max-w-xs">
                                                    <p className="text-xs">Нажмите, чтобы открыть AI-паспорт файла</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    ) : doc.status === 'error' ? (
                                        <span className="text-red-500 text-sm">Ошибка обработки</span>
                                    ) : (
                                        <span className="text-zinc-400 italic text-sm">
                                            Описание будет сгенерировано после обработки...
                                        </span>
                                    )}
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
                                            {doc.aiMetadata && (
                                                <DropdownMenuItem
                                                    onClick={(e) => { e.stopPropagation(); setPassportDoc(doc) }}
                                                    className="rounded-lg"
                                                >
                                                    <Info className="mr-2 h-4 w-4" />
                                                    AI-паспорт
                                                </DropdownMenuItem>
                                            )}
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
        </>
    )
}
