import { headers } from "next/headers";
import Stripe from "stripe";

import { env } from "@/env.mjs";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { addTokens } from "@/lib/balance";
import { resetSubscriptionCycle, handleSubscriptionFailure, handleSubscriptionCancellation } from "@/lib/subscription-manager";
import { addPuBalance } from "@/lib/pu-balance";
import { freezeUserDataOnExpiry } from "@/lib/subscription-freeze";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get("Stripe-Signature") as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (error) {
    return new Response(`Webhook Error: ${error.message}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    // Retrieve the subscription details from Stripe.
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription as string,
    );

    // Update the user stripe into in our database.
    // Since this is the initial subscription, we need to update
    // the subscription id and customer id.
    await prisma.user.update({
      where: {
        id: session?.metadata?.userId,
      },
      data: {
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: subscription.customer as string,
        stripePriceId: subscription.items.data[0].price.id,
        stripeCurrentPeriodEnd: new Date(
          subscription.current_period_end * 1000,
        ),
      },
    });
  }

  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice;

    // PU Subscription renewal
    if (invoice.subscription && invoice.metadata?.type === "pu_subscription") {
      const userId = invoice.metadata?.userId;
      if (userId) {
        try {
          await resetSubscriptionCycle(userId);
          console.log(`[Stripe] Reset subscription cycle for user ${userId}`);
        } catch (error) {
          console.error(`[Stripe] Error resetting cycle for user ${userId}:`, error);
        }
      }
    }

    // Legacy subscription handling
    if (invoice.billing_reason != "subscription_create") {
      // Retrieve the subscription details from Stripe.
      const subscription = await stripe.subscriptions.retrieve(
        invoice.subscription as string,
      );

      // Update the price id and set the new period end.
      await prisma.user.update({
        where: {
          stripeSubscriptionId: subscription.id,
        },
        data: {
          stripePriceId: subscription.items.data[0].price.id,
          stripeCurrentPeriodEnd: new Date(
            subscription.current_period_end * 1000,
          ),
        },
      });
    }
  }

  // Handle payment intents (PU packs + token top-ups)
  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;

    // PU pack purchases
    if (paymentIntent.metadata?.type === "pu_pack") {
      const userId = paymentIntent.metadata.userId;
      const puAmount = parseFloat(paymentIntent.metadata.puAmount || "0");

      if (userId && puAmount > 0) {
        try {
          await addPuBalance({
            userId,
            puAmount,
            type: "PACK_TOPUP",
            description: `PU Pack purchase: ${paymentIntent.metadata.packName || "Custom"}`,
            metadata: {
              stripePaymentId: paymentIntent.id,
              amount: paymentIntent.amount,
            },
          });

          console.log(
            `[Stripe] Added ${puAmount} PU to user ${userId}`
          );
        } catch (error) {
          console.error(
            `[Stripe] Failed to add PU for payment ${paymentIntent.id}:`,
            error
          );
        }
      }
    }

    // Token top-up payments (legacy system)
    if (paymentIntent.metadata?.type === "token_topup") {
      const userId = paymentIntent.metadata.userId;
      const tokensToAdd = parseFloat(paymentIntent.metadata.tokensToAdd || "0");

      if (userId && tokensToAdd > 0) {
        try {
          await addTokens({
            userId,
            amount: tokensToAdd,
            type: "TOPUP",
            description: `Stripe payment: ${paymentIntent.metadata.amountRub} RUB`,
            metadata: {
              stripePaymentId: paymentIntent.id,
              stripeCharges: paymentIntent.charges?.data?.map((c) => ({
                id: c.id,
                amount: c.amount,
              })),
            },
          });

          console.log(
            `[Stripe] Successfully added ${tokensToAdd} tokens to user ${userId}`
          );
        } catch (error) {
          console.error(
            `[Stripe] Failed to add tokens for payment ${paymentIntent.id}:`,
            error
          );
        }
      }
    }
  }

  // Handle subscription updates
  if (event.type === "customer.subscription.updated") {
    const subscription = event.data.object as Stripe.Subscription;
    const userId = subscription.metadata?.userId;

    if (userId) {
      const userSub = await prisma.userSubscription.findUnique({
        where: { userId },
      });

      if (userSub && userSub.stripeSubscriptionId === subscription.id) {
        await prisma.userSubscription.update({
          where: { userId },
          data: {
            stripeStatus: subscription.status,
          },
        });
      }
    }
  }

  // Handle subscription cancellation
  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const userId = subscription.metadata?.userId;

    if (userId) {
      try {
        // Cancel subscription
        await handleSubscriptionCancellation(userId);
        console.log(`[Stripe] Handled subscription cancellation for user ${userId}`);

        // Freeze user data that exceeds FREE tier limits
        try {
          const frozenCount = await freezeUserDataOnExpiry(userId);
          console.log(`[Stripe] Froze ${frozenCount} items for user ${userId}`);
        } catch (freezeError) {
          console.error(`[Stripe] Error freezing data for user ${userId}:`, freezeError);
        }
      } catch (error) {
        console.error(`[Stripe] Error handling cancellation for user ${userId}:`, error);
      }
    }
  }

  return new Response(null, { status: 200 });
}
