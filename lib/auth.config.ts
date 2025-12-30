// lib/auth.config.ts
import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
    pages: {
        signIn: '/login', // Redirect here if not authenticated
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;

            // Identify if the user is on a dashboard route
            // Since (dashboard) is a group, we check if the path is NOT /login,
            // or we can check specific protected paths.
            // Strategy: Protect everything, exclude auth routes/public assets.
            const isOnDashboard = !nextUrl.pathname.startsWith('/login');

            if (isOnDashboard) {
                return isLoggedIn;
                 // Redirect unauthenticated users to the login page
            } else if (isLoggedIn) {
                // If user is logged in and tries to go to /login, send them to the dashboard
                return Response.redirect(new URL('/', nextUrl));
            }
            return true;
        },
    },
    providers: [], // Configured in auth.ts
} satisfies NextAuthConfig;
