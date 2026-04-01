import { prisma } from "@/lib/db";
import { UserSubscriptionPlan } from "types";

const freePlan = {
  title: "Free",
  description: "Бесплатный план",
  benefits: [],
  limitations: [],
  prices: { monthly: 0, yearly: 0 },
  stripeIds: { monthly: null, yearly: null },
};

export async function getUserSubscriptionPlan(
  userId: string
): Promise<UserSubscriptionPlan> {
  if (!userId) throw new Error("Missing parameters");

  const user = await prisma.user.findFirst({
    where: { id: userId },
    select: {
      stripeSubscriptionId: true,
      stripeCurrentPeriodEnd: true,
      stripeCustomerId: true,
      stripePriceId: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return {
    ...freePlan,
    ...user,
    stripeCurrentPeriodEnd: user.stripeCurrentPeriodEnd?.getTime(),
    isPaid: false,
    interval: null,
    isCanceled: false,
  };
}
