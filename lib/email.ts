import { MagicLinkEmail } from "@/emails/magic-link-email";
import { VerificationCodeEmail } from "@/emails/verification-code-email";
import { EmailConfig } from "next-auth/providers/email";
import { Resend } from "resend";

import { env } from "@/env.mjs";
import { siteConfig } from "@/config/site";

import { getUserByEmail } from "./user";

// Lazy singleton — не инициализируется при импорте модуля (иначе падает при сборке без ключа)
let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) _resend = new Resend(env.RESEND_API_KEY);
  return _resend;
}
export const resend = new Proxy({} as Resend, {
  get: (_, prop) => getResend()[prop as keyof Resend],
});

export const sendVerificationRequest: EmailConfig["sendVerificationRequest"] =
  async ({ identifier, url, provider }) => {
    const user = await getUserByEmail(identifier);
    if (!user || !user.name) return;

    const userVerified = user?.emailVerified ? true : false;
    const authSubject = userVerified
      ? `Sign-in link for ${siteConfig.name}`
      : "Activate your account";

    try {
      const { data, error } = await resend.emails.send({
        from: provider.from,
        to:
          process.env.NODE_ENV === "development"
            ? "delivered@resend.dev"
            : identifier,
        subject: authSubject,
        react: MagicLinkEmail({
          firstName: user?.name as string,
          actionUrl: url,
          mailType: userVerified ? "login" : "register",
          siteName: siteConfig.name,
        }),
        // Set this to prevent Gmail from threading emails.
        // More info: https://resend.com/changelog/custom-email-headers
        headers: {
          "X-Entity-Ref-ID": new Date().getTime() + "",
        },
      });

      if (error || !data) {
        throw new Error(error?.message);
      }

      // console.log(data)
    } catch (error) {
      throw new Error("Failed to send verification email.");
    }
  };

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const { data, error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to,
    subject,
    html,
    headers: {
      "X-Entity-Ref-ID": new Date().getTime() + "",
    },
  });

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to send email");
  }

  return data;
}

export async function sendVerificationCode(
  email: string,
  code: string,
  name: string,
  type: "verification" | "password-reset" = "verification"
) {
  const subject = type === "password-reset"
    ? `${code} — код для сброса пароля ${siteConfig.name}`
    : `${code} — код подтверждения для ${siteConfig.name}`;

  try {
    const { data, error } = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: email,
      subject,
      react: VerificationCodeEmail({
        firstName: name,
        code,
        siteName: siteConfig.name,
        type,
      }),
      headers: {
        "X-Entity-Ref-ID": new Date().getTime() + "",
      },
    });

    if (error || !data) {
      throw new Error(error?.message);
    }

    return data;
  } catch (error) {
    console.error("Ошибка отправки письма:", error);
    throw new Error("Не удалось отправить письмо с кодом.");
  }
}
