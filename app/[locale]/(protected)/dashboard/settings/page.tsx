"use client"

import { useTranslations } from "next-intl"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProfileTab } from "@/components/settings/ProfileTab"
import { BillingTab } from "@/components/settings/BillingTab"
import { SecurityTab } from "@/components/settings/SecurityTab"

export default function SettingsPage() {
  const t = useTranslations('Settings')

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Настройки</h2>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-zinc-100/50 p-1 rounded-xl h-auto flex-wrap justify-start gap-1 w-full sm:w-auto inline-flex">
          <TabsTrigger value="profile" className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-500 data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm transition-all">Профиль</TabsTrigger>
          <TabsTrigger value="billing" className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-500 data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm transition-all">Тариф</TabsTrigger>
          <TabsTrigger value="security" className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-500 data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm transition-all">Безопасность</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <ProfileTab />
        </TabsContent>

        <TabsContent value="billing" className="space-y-4">
          <BillingTab />
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <SecurityTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
