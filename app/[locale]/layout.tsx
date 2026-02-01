import "@/styles/globals.css";

import { fontGeistMono, fontGeistSans, fontHeading, fontSans, fontUrban } from "@/assets/fonts";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

import { cn, constructMetadata } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@/components/analytics";
import ModalProvider from "@/components/modals/providers";
import { TailwindIndicator } from "@/components/tailwind-indicator";
import { initializeCronJobs } from "@/lib/init-crons";

interface RootLayoutProps {
  children: React.ReactNode;
  params: { locale: string };
}

export const metadata = constructMetadata();

export default async function RootLayout({ children, params: { locale } }: RootLayoutProps) {
  const messages = await getMessages({ locale });

  // Initialize cron jobs on app start (safe to call multiple times)
  initializeCronJobs().catch(err => console.error('Failed to initialize cron jobs:', err))

  return (
    <html lang={locale} suppressHydrationWarning className={`${fontGeistSans.variable} ${fontGeistMono.variable}`}>
      <head />
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable,
          fontUrban.variable,
          fontHeading.variable,
          fontGeistSans.variable,
          fontGeistMono.variable,
        )}
      >
        <SessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            forcedTheme="light"
            disableTransitionOnChange
          >
            <NextIntlClientProvider messages={messages}>
              <ModalProvider>{children}</ModalProvider>
              <Analytics />
              <Toaster richColors closeButton />
              <TailwindIndicator />
            </NextIntlClientProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
