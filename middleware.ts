import createMiddleware from "next-intl/middleware";
import { auth } from "@/auth";

const intlMiddleware = createMiddleware({
    locales: ["ru"],
    defaultLocale: "ru",
    localePrefix: "always"
});

// Routes that require authentication (matched after stripping locale)
const PROTECTED_PREFIXES = ["/dashboard", "/admin"];

// Routes accessible only for unauthenticated users
const AUTH_ROUTES = ["/login", "/register"];

export default auth((req) => {
    const { nextUrl } = req;
    const { pathname } = nextUrl;

    // 1. Let NextAuth handle its own API routes
    if (pathname.startsWith("/api/auth")) {
        return;
    }

    const isAuthenticated = !!req.auth?.user;

    // Strip locale prefix (e.g. /ru/dashboard → /dashboard)
    const pathnameWithoutLocale = pathname.replace(/^\/[a-z]{2}(\/|$)/, "/");
    const locale = pathname.split("/")[1] || "ru";

    const isProtected = PROTECTED_PREFIXES.some((prefix) =>
        pathnameWithoutLocale.startsWith(prefix)
    );
    const isAuthRoute = AUTH_ROUTES.some((route) =>
        pathnameWithoutLocale === route
    );

    // Redirect unauthenticated users to login
    if (isProtected && !isAuthenticated) {
        return Response.redirect(new URL(`/${locale}/login`, nextUrl.origin));
    }

    // Redirect authenticated users away from login/register
    if (isAuthRoute && isAuthenticated) {
        return Response.redirect(new URL(`/${locale}/dashboard`, nextUrl.origin));
    }

    return intlMiddleware(req);
});

export const config = {
    matcher: ['/((?!api|_next|.*\\..*).*)']
};