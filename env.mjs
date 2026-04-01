import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Skip validation during Docker builds
   * Set SKIP_ENV_VALIDATION=1 during build
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
  server: {
    // This is optional because it's only used in development.
    // See https://next-auth.js.org/deployment.
    NEXTAUTH_URL: z.string().url().optional(),
    AUTH_SECRET: z.string().min(1),
    GOOGLE_CLIENT_ID: z.string().min(1).optional(),
    GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
    YANDEX_CLIENT_ID: z.string().min(1).optional(),
    YANDEX_CLIENT_SECRET: z.string().min(1).optional(),
    GITHUB_OAUTH_TOKEN: z.string().min(1).optional(),
    DATABASE_URL: z.string().min(1),
    RESEND_API_KEY: z.string().min(1).optional(),
    EMAIL_FROM: z.string().min(1),
    // Tochka Bank
    TOCHKA_CUSTOMER_CODE: z.string().min(1).optional(),
    // Shared secret for ai-master service auth
    AI_API_SECRET: z.string().min(1).optional(),
  },


  client: {
    NEXT_PUBLIC_APP_URL: z.string().min(1),
    NEXT_PUBLIC_AI_GATEWAY_URL: z.string().url().optional(),
    NEXT_PUBLIC_AGENT_ORCHESTRATOR_URL: z.string().url().optional(),
  },
  runtimeEnv: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    YANDEX_CLIENT_ID: process.env.YANDEX_CLIENT_ID,
    YANDEX_CLIENT_SECRET: process.env.YANDEX_CLIENT_SECRET,
    GITHUB_OAUTH_TOKEN: process.env.GITHUB_OAUTH_TOKEN,
    DATABASE_URL: process.env.DATABASE_URL,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_AI_GATEWAY_URL: process.env.NEXT_PUBLIC_AI_GATEWAY_URL,
    NEXT_PUBLIC_AGENT_ORCHESTRATOR_URL: process.env.NEXT_PUBLIC_AGENT_ORCHESTRATOR_URL,
    TOCHKA_CUSTOMER_CODE: process.env.TOCHKA_CUSTOMER_CODE,
    AI_API_SECRET: process.env.AI_API_SECRET,
  },
});
