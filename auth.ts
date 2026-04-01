import authConfig from "@/auth.config";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { UserRole } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import NextAuth, { type DefaultSession } from "next-auth";

import { prisma } from "@/lib/db";
import { getUserById } from "@/lib/user";

// More info: https://authjs.dev/getting-started/typescript#module-augmentation
declare module "next-auth" {
  interface Session {
    user: {
      role: UserRole;
      impersonatedBy?: string;
    } & DefaultSession["user"];
  }
}

export const {
  handlers: { GET, POST },
  auth,
} = NextAuth({
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    // error: "/auth/error",
  },
  callbacks: {
    async session({ token, session }) {
      if (session.user) {
        if (token.sub) {
          session.user.id = token.sub;
        }

        if (token.email) {
          session.user.email = token.email;
        }

        if (token.role) {
          session.user.role = token.role;
        }

        session.user.name = token.name;
        session.user.image = token.picture;

        if (token.impersonatedBy) {
          session.user.impersonatedBy = token.impersonatedBy;
        }
      }

      return session;
    },

    async jwt({ token, user }) {
      // On initial sign-in, user object is available from authorize()
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.picture = user.image;
      }

      if (!token.sub) return token;

      // Always try to get fresh user data from DB
      const dbUser = await getUserById(token.sub);

      if (!dbUser) {
        // DEV MODE: Fallback for dev user that may not exist in DB
        if (process.env.NODE_ENV === 'development' && token.sub === 'dev-user-id') {
          token.role = 'ADMIN';
          return token;
        }
        return token;
      }

      // Update token with fresh data from DB
      token.name = dbUser.name;
      token.email = dbUser.email;
      token.picture = dbUser.image;
      token.role = dbUser.role;

      return token;
    },
  },
  events: {
    // Assign FREE subscription when OAuth user is created (Google, Yandex)
    async createUser({ user }) {
      if (!user.id) return;
      try {
        const existing = await prisma.userSubscription.findUnique({ where: { userId: user.id } });
        if (existing) return;

        const freePlan = await prisma.subscriptionPlan.findUnique({ where: { code: 'FREE' } });
        if (!freePlan) return;

        const now = new Date();
        const nextReset = new Date(now);
        nextReset.setMonth(nextReset.getMonth() + 1);

        await prisma.userSubscription.create({
          data: {
            userId: user.id,
            planId: freePlan.id,
            puBalance: freePlan.monthlyPuLimit,
            puLimit: freePlan.monthlyPuLimit,
            billingCycleStartDate: now,
            nextResetDate: nextReset,
            status: 'ACTIVE',
          },
        });
      } catch (err) {
        console.error('[Auth] Failed to create FREE subscription for OAuth user:', err);
      }
    },
  },
  ...authConfig,
  // debug: process.env.NODE_ENV !== "production"
});
