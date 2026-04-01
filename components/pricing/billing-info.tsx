import Link from "next/link";
import * as React from "react";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { UserSubscriptionPlan } from "types";

interface BillingInfoProps extends React.HTMLAttributes<HTMLFormElement> {
  userSubscriptionPlan: UserSubscriptionPlan;
}

export function BillingInfo({ userSubscriptionPlan }: BillingInfoProps) {
  const { title, description } = userSubscriptionPlan;

  return (
    <Card>
      <CardHeader>
        <CardTitle>План подписки</CardTitle>
        <CardDescription>
          Вы сейчас на тарифе <strong>{title}</strong>.
        </CardDescription>
      </CardHeader>
      <CardContent>{description}</CardContent>
      <CardFooter className="flex flex-col items-center space-y-2 border-t bg-accent py-2 md:flex-row md:justify-between md:space-y-0">
        <Link href="/dashboard/billing" className={cn(buttonVariants())}>
          Управление подпиской
        </Link>
      </CardFooter>
    </Card>
  );
}
