import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const weeklySpend = await prisma.tokenUsage.aggregate({
    _sum: { puAmount: true },
    where: {
      userId: session.user.id,
      createdAt: { gte: sevenDaysAgo },
      // @ts-ignore
      requestType: { not: "MANUAL_TEST" },
    },
  });

  const weeklyPuSpent = Math.abs(weeklySpend._sum?.puAmount?.toNumber() || 0);
  const avgDailySpend = weeklyPuSpent / 7;

  return NextResponse.json({ avgDailySpend });
}
