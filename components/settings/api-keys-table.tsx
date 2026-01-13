"use client"

import * as React from "react"
import { Copy, Plus, Trash2, Key, Check } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { mockAPIKeys } from "@/mocks/settings"

export function APIKeysTable() {
    const [keys, setKeys] = React.useState(mockAPIKeys)
    const [showNewKey, setShowNewKey] = React.useState(false)
    const [showDialog, setShowDialog] = React.useState(false) // Control dialog open state
    const [newKeyParams, setNewKeyParams] = React.useState({ name: "" })
    const [generatedKey, setGeneratedKey] = React.useState("")
    const [copied, setCopied] = React.useState(false)

    const handleCreate = () => {
        if (!newKeyParams.name) return

        // Simulate creation
        const randomPart = Math.random().toString(36).substring(2, 15)
        const newFullKey = `sk_live_51MzQ...${randomPart}`

        setGeneratedKey(newFullKey)
        setShowNewKey(true)

        const newMockKey = {
            id: Date.now().toString(),
            name: newKeyParams.name,
            prefix: "pk_live_" + Math.random().toString(36).substring(7),
            lastUsed: "Never",
            created: "Just now"
        }
        setKeys([...keys, newMockKey])
        toast.success("API Key created successfully")
    }

    const refreshDialog = (open: boolean) => {
        setShowDialog(open)
        if (!open) {
            // Reset state when closing
            setTimeout(() => {
                setShowNewKey(false)
                setNewKeyParams({ name: "" })
                setGeneratedKey("")
                setCopied(false)
            }, 300)
        }
    }

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedKey)
        setCopied(true)
        toast.success("Copied to clipboard")
        setTimeout(() => setCopied(false), 2000)
    }

    const handleRevoke = (id: string) => {
        setKeys(keys.filter(k => k.id !== id))
        toast.error("API Key revoked")
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium">API Keys</h3>
                    <p className="text-sm text-muted-foreground">
                        Manage secret keys for accessing the agent API programmatically.
                    </p>
                </div>
                <Dialog open={showDialog} onOpenChange={refreshDialog}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Create New Key
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        {!showNewKey ? (
                            <>
                                <DialogHeader>
                                    <DialogTitle>Create API Key</DialogTitle>
                                    <DialogDescription>
                                        Enter a name for this key to identify it later.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label>Key Name</Label>
                                        <Input
                                            placeholder="e.g. CI/CD Pipeline"
                                            value={newKeyParams.name}
                                            onChange={(e) => setNewKeyParams({ name: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button onClick={handleCreate} disabled={!newKeyParams.name}>Create</Button>
                                </DialogFooter>
                            </>
                        ) : (
                            <>
                                <DialogHeader>
                                    <DialogTitle>Save your key</DialogTitle>
                                    <DialogDescription className="text-amber-600 font-medium bg-amber-50 p-2 rounded-md border border-amber-200 mt-2">
                                        This key will not be displayed again. Please copy it now and store it securely.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="p-4 bg-muted rounded-md border text-sm font-mono break-all relative group my-2">
                                    {generatedKey}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-2 right-2 h-6 w-6"
                                        onClick={handleCopy}
                                    >
                                        {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                                    </Button>
                                </div>
                                <DialogFooter>
                                    <Button onClick={() => refreshDialog(false)}>Done</Button>
                                </DialogFooter>
                            </>
                        )}
                    </DialogContent>
                </Dialog>
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Key Prefix</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead>Last Used</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {keys.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                    Ключей API пока нет.
                                </TableCell>
                            </TableRow>
                        ) : (
                            keys.map((key) => (
                                <TableRow key={key.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <Key className="h-4 w-4 text-muted-foreground" />
                                            {key.name}
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">{key.prefix}...</TableCell>
                                    <TableCell className="text-muted-foreground">{key.created}</TableCell>
                                    <TableCell>{key.lastUsed}</TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10"
                                            onClick={() => handleRevoke(key.id)}
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Revoke
                                        </Button>
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
