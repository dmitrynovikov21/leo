import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Yandex from "next-auth/providers/yandex";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { env } from "@/env.mjs";
import { prisma } from "@/lib/db";

export default {
  providers: [
    Google({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    Yandex({
      clientId: env.YANDEX_CLIENT_ID,
      clientSecret: env.YANDEX_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // DEV MODE: Bypass auth for local development
        const isDev = process.env.NODE_ENV === 'development';
        const isDevEmail = credentials.email === 'dev@test.com';
        const isDevPass = credentials.password === 'devtest123';
        console.log('[AUTH] Dev mode check:', { isDev, isDevEmail, isDevPass, nodeEnv: process.env.NODE_ENV });

        if (isDev && isDevEmail && isDevPass) {
          console.log('[AUTH] Dev user authenticated!');
          return {
            id: 'dev-user-id',
            email: 'dev@test.com',
            name: 'Dev User',
            image: null,
          };
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.password) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        // Block login if email not verified
        // Skip for OAuth users — their email is verified by the provider
        if (!user.emailVerified) {
          const oauthAccount = await prisma.account.findFirst({
            where: { userId: user.id },
          });
          if (!oauthAccount) {
            throw new Error("EMAIL_NOT_VERIFIED");
          }
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
} satisfies NextAuthConfig;
