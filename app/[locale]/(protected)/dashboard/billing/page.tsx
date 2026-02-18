import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/session";
import { constructMetadata } from "@/lib/utils";
import { DashboardHeader } from "@/components/dashboard/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PaymentButton } from "@/components/billing/payment-button";
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

// Mock Data removed


import { prisma } from "@/lib/db";

// ... existing imports

// Remove mock plans


export default async function BillingPage() {
  const user = await getCurrentUser();
  const t = await getTranslations('Billing');

  // Calculate date range for current month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  // Fetch data
  const [validation, usageStats, monthlyStats, lastMonthStats, agentStats, dbTransactions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user?.id },
      include: { subscription: true }
    }),
    // Total usage forever
    prisma.tokenUsage.aggregate({
      _sum: {
        totalTokens: true
      },
      where: {
        userId: user?.id,
        // @ts-ignore
        requestType: { not: 'MANUAL_TEST' }
      }
    }),
    // Usage this month
    prisma.tokenUsage.aggregate({
      _sum: {
        realCostUsd: true,
        totalTokens: true
      },
      where: {
        userId: user?.id,
        createdAt: { gte: startOfMonth },
        // @ts-ignore
        requestType: { not: 'MANUAL_TEST' }
      }
    }),
    // Usage last month
    prisma.tokenUsage.aggregate({
      _sum: {
        realCostUsd: true,
        totalTokens: true
      },
      where: {
        userId: user?.id,
        createdAt: {
          gte: startOfLastMonth,
          lt: startOfMonth
        },
        // @ts-ignore
        requestType: { not: 'MANUAL_TEST' }
      }
    }),
    // Agent usage breakdown
    prisma.tokenUsage.groupBy({
      by: ['agentId'],
      _sum: {
        totalTokens: true,
        realCostUsd: true,
      },
      _count: {
        id: true
      },
      where: {
        userId: user?.id,
        // @ts-ignore
        requestType: { in: ['AGENT_CHAT'] }, // Only count chat dialogs for "dialogs" count? Or simplified?
        agentId: { not: null }
      }
    }),
    // Recent PU Transactions
    prisma.puTransaction.findMany({
      where: { userId: user?.id },
      orderBy: { createdAt: 'desc' },
      take: 10
    })
  ]);

  // Fetch agent details for the stats
  const agentIds = agentStats.filter(s => s.agentId).map(s => s.agentId as string);
  const agents = await prisma.agent.findMany({
    where: { id: { in: agentIds } },
    select: { id: true, name: true, role: true, avatarEmoji: true }
  });

  // Calculate monthly spending in RUB
  const USD_TO_RUB = 90;

  const monthlyTokens = monthlyStats._sum?.totalTokens || 0;
  const lastMonthTokens = lastMonthStats._sum?.totalTokens || 0;

  // Calculate percentage change based on TOKENS
  let percentChange = 0;
  if (lastMonthTokens > 0) {
    percentChange = Math.round(((monthlyTokens - lastMonthTokens) / lastMonthTokens) * 100);
  } else if (monthlyTokens > 0) {
    percentChange = 100;
  }

  // Formatting helper
  const formatTokens = (num: number) => {
    if (num > 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num > 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toLocaleString();
  };

  const monthlyTokensFormatted = formatTokens(monthlyTokens);

  // Prepare agent rows (Display Tokens in "Cost" column instead of RUB)
  const agentCosts = agentStats.map(stat => {
    const agent = agents.find(a => a.id === stat.agentId);
    const tokens = stat._sum?.totalTokens || 0;

    // Request count is in stat._count.id? No, with groupBy, _count contains the counts of fields.
    // If we did _count: { id: true }, then stat._count.id is the number.
    // The error "Property 'id' does not exist on type 'true'" implies TS thinks `id: true` is the type not the value?
    // Ah, "Property 'id' does not exist on type 'true | { ... }'".
    // Let's safe cast or check.
    // For now, let's assume it works at runtime and just cast to any to silence strict TS if needed, OR fix logic.
    const requestCount = typeof stat._count === 'object' && stat._count !== null && 'id' in stat._count
      ? (stat._count as any).id
      : 0;

    return {
      name: agent?.name || "Unknown Agent",
      role: agent?.role || "Агент",
      tokens: formatTokens(tokens),
      dialogs: requestCount,
      rawTokens: tokens, // store raw for sorting if needed
      avatar: agent?.avatarEmoji || "🤖"
    };
  }).sort((a, b) => b.rawTokens - a.rawTokens); // Sort by tokens usage

  const totalTokensUsed = usageStats._sum?.totalTokens || 0;
  // Format 1.2M style
  const formattedTotalTokens = formatTokens(totalTokensUsed);

  // Map PU transactions
  const transactions = dbTransactions.map(tx => {
    let method = 'usage';
    let description = tx.description || 'Использование ресурсов';

    if (tx.type === 'SUBSCRIPTION_GRANT' || tx.type === 'PACK_TOPUP') {
      method = 'card';
      description = tx.description || 'Пополнение баланса';
    } else if (tx.type === 'OVERAGE_DEDUCTION') {
      method = 'usage';
      description = tx.description || 'Списание за использование';
    } else if (tx.type === 'REFUND') {
      method = 'invoice';
      description = tx.description || 'Возврат средств';
    } else if (tx.type === 'ADMIN_ADJUSTMENT') {
      method = 'card';
      description = tx.description || 'Корректировка баланса';
    }

    return {
      id: tx.id,
      date: tx.createdAt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }),
      amount: tx.puAmount.toNumber(),
      status: 'success',
      method,
      description
    };
  });

  const dbPlans = await prisma.subscriptionPlan.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: 'asc' }
  });

  const userWithSub = validation;
  const currentPlan = userWithSub?.subscription?.planId ?
    dbPlans.find(p => p.id === userWithSub.subscription?.planId) : null;

  const plans = dbPlans.map(plan => {
    const startPrice = plan.priceMonthlyRub.toNumber().toLocaleString('ru-RU');
    const features = Array.isArray(plan.features)
      ? (plan.features as any[]).filter(f => f.included).map(f => f.text)
      : [];

    let description = "";
    let recommended = false;

    switch (plan.code) {
      case 'BASIC':
        description = "Для старта";
        break;
      case 'PRO':
        description = "Для профессионалов";
        recommended = true;
        break;
      case 'BUSINESS':
        description = "Для растущих команд";
        break;
      case 'ENTERPRISE':
        description = "Для крупных компаний";
        break;
    }

    return {
      id: plan.id,
      name: plan.name,
      price: `₽${startPrice}`,
      period: "/мес",
      description,
      features,
      active: validation?.subscription?.planId === plan.id,
      recommended,
      amount: plan.priceMonthlyRub.toNumber() // Raw amount for payment
    };
  });

  // Use only PU balance
  // @ts-ignore
  const puBalance = validation?.subscription?.puBalance ? Number(validation.subscription.puBalance) : 0;

  const lowBalanceThreshold = 50;
  const isLowBalance = puBalance < lowBalanceThreshold;
  const runwayDays = Math.floor(puBalance / 100);

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
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="relative overflow-hidden border border-zinc-200/50 shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-white rounded-2xl">
            <CardHeader className="pb-3">
              <CardDescription className="text-zinc-500 font-medium">{t('currentBalance')} (PU)</CardDescription>
              <CardTitle className={cn(
                "text-3xl tabular-nums font-bold text-zinc-900 tracking-tight",
                isLowBalance && "text-red-600"
              )}>
                {puBalance.toLocaleString()} <span className="text-lg font-medium text-zinc-500 ml-1">PU</span>
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

          {/* Hidden "This Month" Card */}

          <Card className="border border-zinc-200/50 shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-white rounded-2xl">
            <CardHeader className="pb-3">
              <CardDescription className="text-zinc-500 font-medium">{t('totalTokens')}</CardDescription>
              <CardTitle className="text-3xl tabular-nums font-bold text-zinc-900 tracking-tight">
                {formattedTotalTokens}
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
                  <div className="absolute top-4 right-4">
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
                  <PaymentButton
                    planId={plan.id}
                    amount={plan.amount}
                    planName={plan.name}
                    isCurrent={plan.active}
                    className="w-full h-11 rounded-xl font-semibold shadow-sm"
                  />
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
                  <TableHead className="text-right text-zinc-500 font-medium pr-6">Расход (токены)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agentCosts.map((agent) => (
                  <TableRow key={agent.name} className="hover:bg-zinc-50/80 border-zinc-100 transition-colors">
                    <TableCell className="pl-6 py-4">
                      <div className="flex items-center gap-3">
                        {agent.avatar.startsWith('/') ? (
                          <Avatar className="h-10 w-10 border border-zinc-200 rounded-xl">
                            <AvatarImage src={agent.avatar} alt={agent.name} />
                            <AvatarFallback className="bg-zinc-100 text-zinc-600 font-bold rounded-xl flex items-center justify-center h-full w-full">
                              {agent.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="flex items-center justify-center h-10 w-10 border border-zinc-200 rounded-xl bg-zinc-50 text-xl">
                            {agent.avatar}
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="font-semibold text-zinc-900 text-sm">{agent.name}</span>
                          <span className="text-xs text-zinc-500 font-medium">{agent.role}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                        <Badge variant="outline" className="w-fit bg-zinc-50 border-zinc-200 text-zinc-600 font-medium rounded-lg">{agent.dialogs} запросов</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <span className="font-bold text-zinc-900 tabular-nums">{agent.tokens}</span>
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
                        {tx.amount > 0 ? '+' : ''}{Math.abs(tx.amount).toLocaleString()} PU
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
