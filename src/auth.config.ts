import type { NextAuthConfig } from 'next-auth';
import { NextResponse } from 'next/server';

/**
 * Config edge-safe (sem Prisma nem bcrypt) — usada pelo middleware.
 * `src/auth.ts` acrescenta o provider Credentials e o refresh do token a partir da DB.
 */

const AUTH_PAGES = ['/login', '/register'];
/** Páginas abertas com ou sem sessão (links dos emails e documentos legais). */
const PUBLIC_PAGES = ['/start', '/forgot-password', '/reset-password', '/verify-email', '/confirm-email-change', '/privacy', '/terms', '/goodbye', '/offline'];

export const authConfig = {
  trustHost: true,
  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const user = auth?.user;
      const isAuthPage = AUTH_PAGES.includes(pathname);
      const isOnboarding = pathname === '/welcome';
      const isApi = pathname.startsWith('/api/');

      if (PUBLIC_PAGES.includes(pathname)) return true;

      if (!user) {
        if (isAuthPage) return true;
        // Primeira visita (sem sessão) à raiz: a página de entrada em vez do login.
        if (pathname === '/') return NextResponse.redirect(new URL('/start', request.nextUrl));
        if (isApi) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
        return false; // → /login
      }

      if (!user.onboarded) {
        if (isOnboarding || isApi) return true;
        return NextResponse.redirect(new URL('/welcome', request.nextUrl));
      }

      if (isAuthPage) {
        return NextResponse.redirect(new URL('/', request.nextUrl));
      }

      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.name = user.name ?? '';
        token.email = user.email ?? '';
        token.locale = user.locale ?? 'PT_PT';
        token.theme = user.theme ?? 'LIGHT';
        token.onboarded = user.onboarded ?? false;
      }
      return token;
    },
    session({ session, token }) {
      session.user = {
        ...session.user,
        id: token.id,
        name: token.name,
        email: token.email,
        locale: token.locale,
        theme: token.theme,
        onboarded: token.onboarded,
      };
      return session;
    },
  },
} satisfies NextAuthConfig;
