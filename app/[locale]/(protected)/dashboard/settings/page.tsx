"use client"

import { useTranslations } from "next-intl"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProfileTab } from "@/components/settings/ProfileTab"
import { BillingTab } from "@/components/settings/BillingTab"
import { SecurityTab } from "@/components/settings/SecurityTab"
import { ApiTab } from "@/components/settings/ApiTab"
import { NotificationsTab } from "@/components/settings/NotificationsTab"
import { OrganizationTab } from "@/components/settings/OrganizationTab"

export default function SettingsPage() {
  const t = useTranslations('Settings')

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('description')}</p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-xl h-auto flex-wrap justify-start gap-1 w-full sm:w-auto inline-flex">
          <TabsTrigger value="profile" className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all">Профиль</TabsTrigger>
          <TabsTrigger value="organization" className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all">Организация</TabsTrigger>
          <TabsTrigger value="billing" className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all">Тариф</TabsTrigger>
          <TabsTrigger value="api" className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all">API</TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all">Уведомления</TabsTrigger>
          <TabsTrigger value="security" className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all">Безопасность</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <ProfileTab />
        </TabsContent>

        <TabsContent value="organization" className="space-y-4">
          <OrganizationTab />
        </TabsContent>

        <TabsContent value="billing" className="space-y-4">
          <BillingTab />
        </TabsContent>

        <TabsContent value="api" className="space-y-4">
          <ApiTab />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <NotificationsTab />
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <SecurityTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
