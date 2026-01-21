import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/session";
import { constructMetadata } from "@/lib/utils";
import { DashboardHeader } from "@/components/dashboard/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CreditCard, Check, Zap, FileText, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const metadata = constructMetadata({
  title: "Billing & Usage – SaaS Starter",
  description: "Monitor your AI spending and manage your balance.",
});

// Mock Data
const agentCosts = [
  { name: "Олег HR", role: "Рекрутер", tokens: "1.2M", dialogs: 450, cost: 1250, avatar: "/avatars/oleg.png" },
  { name: "Саппорт Бот", role: "L1 Поддержка", tokens: "850k", dialogs: 310, cost: 890, avatar: "/avatars/support.png" },
  { name: "Ассистент Продаж", role: "Продажи", tokens: "120k", dialogs: 45, cost: 150, avatar: "/avatars/sales.png" },
];

const transactions = [
  { id: 1, date: "10 Дек, 2025", method: "card", description: "Visa •••• 4242", amount: 5000, status: "succeeded" },
  { id: 2, date: "01 Дек, 2025", method: "invoice", description: "Счет #1024", amount: 15000, status: "processing" },
  { id: 3, date: "15 Ноя, 2025", method: "usage", description: "Ежемесячный расход", amount: -2340, status: "completed" },
];

const plans = [
  {
    name: "Пробный",
    price: "₽0",
    period: "/мес",
    description: "Для тестов и хобби",
    features: ["1 Агент", "10k Токенов/мес", "Поддержка сообщества"],
    active: false,
  },
  {
    name: "Pro",
    price: "₽2,900",
    period: "/мес",
    description: "Для фрилансеров",
    features: ["3 Агента", "1M Токенов/мес", "Приоритетная поддержка", "API Доступ"],
    active: true,
    recommended: true,
  },
  {
    name: "Бизнес",
    price: "₽9,900",
    period: "/мес",
    description: "Для команд и стартапов",
    features: ["Безлимит агентов", "10M Токенов/мес", "Выделенный менеджер", "SSO Вход"],
    active: false,
  },
];

export default async function BillingPage() {
  const user = await getCurrentUser();
  const t = await getTranslations('Billing');

  const balance = 1250;
  const lowBalanceThreshold = 500;
  const isLowBalance = balance < lowBalanceThreshold;
  const runwayDays = Math.floor(balance / 50);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <DashboardHeader
        heading={t('title')}
        text={t('description')}
      />

      <div className="space-y-8 pb-10">
        {/* 1. Low Balance Alert */}
        {isLowBalance && (
          <Alert variant="destructive" className="rounded-2xl border-red-200 bg-red-50 text-red-900">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertTitle className="text-red-900 font-semibold">{t('lowBalanceWarning')}</AlertTitle>
            <AlertDescription className="text-red-800">
              {t('agentsMayStop')}. {t('estimatedRunway')}: ~{runwayDays} {t('days')}
            </AlertDescription>
          </Alert>
        )}

        {/* Section A: Financial Vitals */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="relative overflow-hidden border border-zinc-200/50 shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-white rounded-2xl">
            <CardHeader className="pb-3">
              <CardDescription className="text-zinc-500 font-medium">{t('currentBalance')}</CardDescription>
              <CardTitle className={cn(
                "text-3xl tabular-nums font-bold text-zinc-900 tracking-tight",
                isLowBalance && "text-red-600"
              )}>
                ₽ {balance.toLocaleString()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-500 font-medium mb-4">
                {t('estimatedRunway')}: ~{runwayDays} {t('days')}
              </p>
              <Button className="w-full shadow-sm rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 font-medium h-10">
                <CreditCard className="mr-2 h-4 w-4" />
                {t('topUpBalance')}
              </Button>
            </CardContent>
          </Card>

          <Card className="border border-zinc-200/50 shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-white rounded-2xl">
            <CardHeader className="pb-3">
              <CardDescription className="text-zinc-500 font-medium">{t('thisMonth')}</CardDescription>
              <CardTitle className="text-3xl tabular-nums font-bold text-zinc-900 tracking-tight">
                ₽ 4,500
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm mt-1">
                <Badge variant="outline" className="text-green-700 bg-green-50 border-green-200 rounded-lg px-2 py-0.5 font-semibold">
                  +12%
                </Badge>
                <span className="text-zinc-500 font-medium">{t('vsLastMonth')}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-zinc-200/50 shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-white rounded-2xl">
            <CardHeader className="pb-3">
              <CardDescription className="text-zinc-500 font-medium">{t('totalTokens')}</CardDescription>
              <CardTitle className="text-3xl tabular-nums font-bold text-zinc-900 tracking-tight">
                1.2M
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm mt-1">
                <Zap className="h-4 w-4 text-amber-500 fill-amber-500" />
                <span className="text-zinc-500 font-medium">{t('processedThisMonth')}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Section B: Subscription Plans */}
        <div>
          <h3 className="text-xl font-bold text-zinc-900 mb-6">Доступные тарифы</h3>
          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={cn(
                  "flex flex-col relative transition-all rounded-3xl", // Changed to rounded-3xl for cards in grid
                  plan.active
                    ? "border-zinc-900 ring-1 ring-zinc-900 shadow-xl bg-zinc-900 text-white"
                    : "border-zinc-200/50 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-lg hover:border-zinc-300 transition-all"
                )}
              >
                {plan.recommended && (
                  <div className="absolute top-0 right-0 transform translate-x-px -translate-y-[50%]">
                    <Badge className="bg-zinc-900 text-white border border-zinc-800 hover:bg-zinc-800 rounded-full px-3 py-1 shadow-sm">
                      Рекомендуем
                    </Badge>
                  </div>
                )}
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className={cn("text-xl font-bold", plan.active ? "text-white" : "text-zinc-900")}>{plan.name}</CardTitle>
                      <CardDescription className={cn("mt-1 font-medium", plan.active ? "text-zinc-400" : "text-zinc-500")}>{plan.description}</CardDescription>
                    </div>
                    {plan.active && <div className="h-6 w-6 rounded-full bg-white flex items-center justify-center text-zinc-900"><Check className="h-3 w-3 sm:h-4 sm:w-4" /></div>}
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className={cn("text-4xl font-bold tracking-tight", plan.active ? "text-white" : "text-zinc-900")}>{plan.price}</span>
                    <span className={cn("text-sm font-medium", plan.active ? "text-zinc-400" : "text-zinc-500")}>{plan.period}</span>
                  </div>
                  <ul className="space-y-3 text-sm">
                    {plan.features.map((feature) => (
                      <li key={feature} className={cn("flex items-center gap-3 font-medium", plan.active ? "text-zinc-300" : "text-zinc-600")}>
                        <Check className={cn("h-4 w-4", plan.active ? "text-white" : "text-zinc-900")} /> {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    variant={plan.active ? "secondary" : "outline"}
                    className={cn(
                      "w-full h-11 rounded-xl font-semibold shadow-sm",
                      plan.active
                        ? "bg-white text-zinc-900 hover:bg-zinc-100"
                        : "border-zinc-200 hover:bg-zinc-50 text-zinc-900"
                    )}
                  >
                    {plan.active ? "Текущий план" : "Перейти"}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>

        {/* Section C: Agent Unit Economics */}
        <Card className="border border-zinc-200/50 shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-white rounded-2xl overflow-hidden">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-zinc-900">Расход по агентам</CardTitle>
            <CardDescription className="text-zinc-500 font-medium">Детализация затрат на каждого активного сотрудника</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-zinc-100">
                  <TableHead className="text-zinc-500 font-medium pl-6">Агент</TableHead>
                  <TableHead className="text-zinc-500 font-medium">Использование</TableHead>
                  <TableHead className="text-right text-zinc-500 font-medium pr-6">Расход</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agentCosts.sort((a, b) => b.cost - a.cost).map((agent) => (
                  <TableRow key={agent.name} className="hover:bg-zinc-50/80 border-zinc-100 transition-colors">
                    <TableCell className="pl-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border border-zinc-200 rounded-xl">
                          <AvatarImage src={agent.avatar} alt={agent.name} />
                          <AvatarFallback className="bg-zinc-100 text-zinc-600 font-bold rounded-xl">{agent.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-semibold text-zinc-900 text-sm">{agent.name}</span>
                          <span className="text-xs text-zinc-500 font-medium">{agent.role}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                        <Badge variant="outline" className="w-fit bg-zinc-50 border-zinc-200 text-zinc-600 font-medium rounded-lg">{agent.tokens} токенов</Badge>
                        <span className="text-xs text-zinc-400 font-medium">{agent.dialogs} диалогов</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <span className="font-bold text-zinc-900 tabular-nums">₽ {agent.cost.toLocaleString()}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Section D: Transaction History */}
        <Card className="border border-zinc-200/50 shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-white rounded-2xl overflow-hidden">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-zinc-900">{t('recentTransactions')}</CardTitle>
            <CardDescription className="text-zinc-500 font-medium">{t('transactionsDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-zinc-100">
                  <TableHead className="w-[150px] pl-6 text-zinc-500 font-medium">Дата</TableHead>
                  <TableHead className="text-zinc-500 font-medium">Метод</TableHead>
                  <TableHead className="text-zinc-500 font-medium">Сумма</TableHead>
                  <TableHead className="text-right text-zinc-500 font-medium pr-6">Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id} className="hover:bg-zinc-50/80 border-zinc-100 transition-colors">
                    <TableCell className="text-zinc-500 font-medium text-xs sm:text-sm pl-6 py-4">
                      {tx.date}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-zinc-100 flex items-center justify-center border border-zinc-200/60">
                          {tx.method === 'card' ? (
                            <CreditCard className="h-4 w-4 text-zinc-500" />
                          ) : tx.method === 'invoice' ? (
                            <FileText className="h-4 w-4 text-zinc-500" />
                          ) : (
                            <Zap className="h-4 w-4 text-zinc-500" />
                          )}
                        </div>
                        <span className="text-sm font-semibold text-zinc-700">{tx.description}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "font-bold tabular-nums text-sm",
                        tx.amount > 0 ? "text-green-600" : "text-zinc-900"
                      )}>
                        {tx.amount > 0 ? '+' : ''}₽ {Math.abs(tx.amount).toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end gap-3 items-center">
                        {tx.status === 'processing' ? (
                          <Badge variant="outline" className="text-amber-700 border-amber-200 bg-amber-50 rounded-lg px-2.5 py-0.5 font-medium">Обработка</Badge>
                        ) : (
                          <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50 rounded-lg px-2.5 py-0.5 font-medium">Успешно</Badge>
                        )}
                        {tx.method !== 'usage' && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100">
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
