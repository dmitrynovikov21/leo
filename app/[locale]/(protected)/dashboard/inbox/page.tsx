import { InboxLayout } from "@/components/inbox/inbox-layout"
import { getTranslations } from "next-intl/server"

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
    const t = await getTranslations({ locale, namespace: "Dashboard" })
    return {
        title: "Inbox | Leo Platform",
    }
}

export default async function InboxPage() {
    const t = await getTranslations('Inbox')

    return (
        <div className="flex flex-1 flex-col gap-6 p-6 h-[calc(100vh-theme(spacing.16))]">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900">{t('title')}</h1>
                    <p className="text-sm text-muted-foreground">{t('subtitle') || 'Управление сообщениями и диалогами'}</p>
                </div>
            </div>
            <InboxLayout />
        </div>
    )
}
