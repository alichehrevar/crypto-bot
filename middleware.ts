// middleware.ts
import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
    const publicPaths = ['/login', '/register', '/api', '/public', '/images'];

    // Allow public paths.
    if (publicPaths.some((path) => req.nextUrl.pathname.startsWith(path))) {
        return NextResponse.next();
    }

    // Allow API routes.
    if (req.nextUrl.pathname.startsWith('/api')) {
        return NextResponse.next();
    }

    // Check for token in cookies.
    const token = req.cookies.get('token')?.value;

    if (!token) {
        return NextResponse.redirect(new URL('/login', req.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
