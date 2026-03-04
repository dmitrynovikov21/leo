"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import {
    FileText,
    Folder,
    MoreHorizontal,
    AlertCircle,
    CheckCircle2,
    Loader2,
    Eye,
    Trash2,
    Search,
    FolderPlus,
    Upload
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Badge } from "@/components/ui/badge"

import { mockKnowledgeItems, type KnowledgeItem, type FileStatus } from "@/mocks/knowledge-items"

interface BreadcrumbItem {
    id: string | null
    name: string
}

export function FileManagerTable() {
    const t = useTranslations('Knowledge')
    const tCommon = useTranslations('Common')

    const [currentFolderId, setCurrentFolderId] = React.useState<string | null>(null)
    const [searchQuery, setSearchQuery] = React.useState("")

    // Build breadcrumb path
    const breadcrumbs = React.useMemo((): BreadcrumbItem[] => {
        if (!currentFolderId) {
            return [{ id: null, name: t('knowledgeBase') }]
        }

        const path: BreadcrumbItem[] = []
        let current: string | null = currentFolderId

        while (current) {
            const item = mockKnowledgeItems.find(i => i.id === current)
            if (!item || item.type !== 'folder') break

            path.unshift({ id: item.id, name: item.name })
            current = item.parentId
        }

        return [{ id: null, name: t('knowledgeBase') }, ...path]
    }, [currentFolderId, t])

    // Get items in current folder
    const currentItems = React.useMemo(() => {
        let items = mockKnowledgeItems.filter(item => item.parentId === currentFolderId)

        // Apply search filter
        if (searchQuery.trim()) {
            items = items.filter(item =>
                item.name.toLowerCase().includes(searchQuery.toLowerCase())
            )
        }

        // Sort: folders first, then files, alphabetically within groups
        return items.sort((a, b) => {
            if (a.type === 'folder' && b.type === 'file') return -1
            if (a.type === 'file' && b.type === 'folder') return 1
            return a.name.localeCompare(b.name)
        })
    }, [currentFolderId, searchQuery])

    const getStatusBadge = (status: FileStatus) => {
        switch (status) {
            case 'ready':
                return (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        {t('ready')}
                    </Badge>
                )
            case 'processing':
                return (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-800">
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        {t('processing')}
                    </Badge>
                )
            case 'error':
                return (
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-800">
                        <AlertCircle className="mr-1 h-3 w-3" />
                        {t('failed')}
                    </Badge>
                )
        }
    }

    const handleFolderClick = (folderId: string) => {
        setCurrentFolderId(folderId)
    }

    const handleBreadcrumbClick = (folderId: string | null) => {
        setCurrentFolderId(folderId)
    }

    return (
        <div className="space-y-6">
            {/* Toolbar: Search + Actions */}
            <div className="flex items-center justify-between gap-4">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder={t('search')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                        <FolderPlus className="mr-2 h-4 w-4" />
                        {t('createFolder')}
                    </Button>
                    <Button size="sm">
                        <Upload className="mr-2 h-4 w-4" />
                        {t('uploadFiles')}
                    </Button>
                </div>
            </div>

            {/* Breadcrumb Navigation */}
            <Breadcrumb>
                <BreadcrumbList>
                    {breadcrumbs.map((crumb, index) => (
                        <React.Fragment key={crumb.id ?? 'root'}>
                            <BreadcrumbItem>
                                {index === breadcrumbs.length - 1 ? (
                                    <BreadcrumbPage className="text-foreground">{crumb.name}</BreadcrumbPage>
                                ) : (
                                    <BreadcrumbLink asChild>
                                        <Button
                                            variant="link"
                                            onClick={() => handleBreadcrumbClick(crumb.id)}
                                            className="p-0 h-auto text-muted-foreground hover:text-foreground"
                                        >
                                            {crumb.name}
                                        </Button>
                                    </BreadcrumbLink>
                                )}
                            </BreadcrumbItem>
                            {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
                        </React.Fragment>
                    ))}
                </BreadcrumbList>
            </Breadcrumb>

            {/* Table */}
            <div className="rounded-md border border-white/10">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent border-white/10">
                            <TableHead className="w-[40px]"></TableHead>
                            <TableHead>{t('fileName')}</TableHead>
                            <TableHead>{t('fileStatus')}</TableHead>
                            <TableHead>{t('size')}</TableHead>
                            <TableHead>{t('addedDate')}</TableHead>
                            <TableHead className="text-right">{tCommon('actions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {currentItems.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                                    {searchQuery ? t('noResults') : t('emptyFolder')}
                                </TableCell>
                            </TableRow>
                        ) : (
                            currentItems.map((item) => (
                                <TableRow
                                    key={item.id}
                                    className="hover:bg-muted/50 border-white/10 transition-colors"
                                >
                                    <TableCell>
                                        {item.type === 'folder' ? (
                                            <Folder className="h-5 w-5 text-blue-400 fill-current" />
                                        ) : (
                                            <FileText className="h-5 w-5 text-muted-foreground" />
                                        )}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {item.type === 'folder' ? (
                                            <Button
                                                variant="link"
                                                onClick={() => handleFolderClick(item.id)}
                                                className="p-0 h-auto font-medium text-foreground hover:text-blue-400"
                                            >
                                                {item.name}
                                            </Button>
                                        ) : (
                                            <div className="flex flex-col">
                                                <span>{item.name}</span>
                                                {item.errorMessage && (
                                                    <span className="text-xs text-red-500 dark:text-red-400">
                                                        {item.errorMessage}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {item.type === 'file' && item.status && getStatusBadge(item.status)}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {item.size || '—'}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {item.uploadDate ? new Date(item.uploadDate).toLocaleDateString('ru-RU') : '—'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                    <span className="sr-only">{tCommon('actions')}</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent
                                                align="end"
                                                className="bg-[#09090b] border border-white/10 shadow-xl shadow-black/50"
                                            >
                                                <DropdownMenuLabel className="text-xs text-muted-foreground">
                                                    {tCommon('actions')}
                                                </DropdownMenuLabel>
                                                {item.type === 'file' && (
                                                    <DropdownMenuItem className="text-foreground hover:bg-card/5 focus:bg-card/5 cursor-pointer">
                                                        <Eye className="mr-2 h-3.5 w-3.5" /> {t('inspect')}
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuSeparator className="bg-card/10" />
                                                <DropdownMenuItem className="text-foreground hover:bg-red-500/10 hover:text-red-500 focus:bg-red-500/10 focus:text-red-500 cursor-pointer">
                                                    <Trash2 className="mr-2 h-3.5 w-3.5" /> {tCommon('delete')}
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
