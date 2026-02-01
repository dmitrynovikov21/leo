import { redirect } from "next/navigation";
import Link from "next/link";

import { getCurrentUser } from "@/lib/session";
import { DashboardHeader } from "@/components/dashboard/header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Icons } from "@/components/shared/icons";
import { Coins, TrendingUp, BarChart3 } from "lucide-react";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  return (
    <>
      <DashboardHeader
        heading="Панель администратора"
        text="Управление пользователями, настройками и системной конфигурацией."
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/admin/unit-economics" className="block">
          <Card className="h-full transition-colors hover:bg-muted/50 cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Юнит-экономика</CardTitle>
              <TrendingUp className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">📊</div>
              <p className="text-xs text-muted-foreground">
                Анализ выручки vs затрат
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/users-balance" className="block">
          <Card className="h-full transition-colors hover:bg-muted/50 cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Балансы пользователей</CardTitle>
              <Icons.user className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">👥</div>
              <p className="text-xs text-muted-foreground">
                Управление балансами PU
              </p>
            </CardContent>
          </Card>
        </Link>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Статус системы</CardTitle>
            <Icons.check className="size-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Онлайн</div>
            <p className="text-xs text-muted-foreground">
              Все системы работают
            </p>
          </CardContent>
        </Card>

        <Link href="/admin/subscriptions" className="block">
          <Card className="h-full transition-colors hover:bg-muted/50 cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Подписки</CardTitle>
              <Coins className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">🎁</div>
              <p className="text-xs text-muted-foreground">
                Управление подписками пользователей
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/prompts" className="block">
          <Card className="h-full transition-colors hover:bg-muted/50 cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Системные промпты</CardTitle>
              <Icons.post className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">AI</div>
              <p className="text-xs text-muted-foreground">
                Редактировать промпты для генерации
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </>
  );
}
