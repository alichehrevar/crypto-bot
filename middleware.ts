// middleware.ts
import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
    const { pathname, origin } = req.nextUrl;

    const publicPaths = ['/login', '/register', '/public', '/images', '/api', '/'];

    if (publicPaths.some((p) => pathname.startsWith(p))) {
        return NextResponse.next();
    }

    // Require presence of token (fast check)
    const token = req.cookies.get('token')?.value;

    if (!token) {
        return NextResponse.redirect(new URL('/login', req.url));
    }

    // Extra guard for /admin: call internal /api/session and FORWARD COOKIES
    if (pathname.startsWith('/admin')) {
        try {
            const resp = await fetch(`${origin}/api/session`, {
                // ⬇️ forward cookies from the incoming request
                headers: { cookie: req.headers.get('cookie') || '' },
                cache: 'no-store',
            });

            if (!resp.ok) {
                return NextResponse.redirect(new URL('/login', req.url));
            }

            const data = await resp.json(); // { role, userId }

            if (data.role !== 'admin') {
                return NextResponse.redirect(new URL('/403', req.url));
            }
        } catch {
            return NextResponse.redirect(new URL('/login', req.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
