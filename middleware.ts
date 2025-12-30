// middleware.ts
import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';

export default NextAuth(authConfig).auth;

export const config = {
    // Matcher: Exclude api, static files, and images
    // This effectively protects all "page" routes except those explicitly excluded
    matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};
