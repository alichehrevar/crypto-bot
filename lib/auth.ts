// lib/auth.ts
import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { sendRequest } from "@/actions/post";
import { AuthResponse } from "@/types/auth";

export const { signIn, signOut, handlers } = NextAuth({
    ...authConfig,
    trustHost: true,
    providers: [
        Credentials({
            async authorize(credentials) {
                // 1. Validate Input
                const parsedCredentials = z.object({
                    email: z.string().email(),
                    password: z.string().min(1),
                    lat: z.string().optional(),
                    lng: z.string().optional(),
                    device_city: z.string().optional(),
                    device_country: z.string().optional(),
                }).safeParse(credentials);

                if (parsedCredentials.success) {
                    const { email, password, lat, lng, device_city, device_country } = parsedCredentials.data;

                    try {
                        // 2. Call Backend
                        const response: AuthResponse = await sendRequest({
                            email,
                            password,
                            lat,
                            lng,
                            device_city,
                            device_country,
                            source: 'login',
                        }, '/auth/login');

                        // 3. Handle Success
                        // Check for success AND existence of data/user/token to avoid crashes
                        if (response.success && response.data?.token && response.data?.user) {
                            return {
                                // Map backend fields to NextAuth User object
                                // Use the actual user ID from backend, not email
                                id: response.data.user.email,
                                email: response.data.user.email,
                                accessToken: response.data.token,
                            };
                        }

                        console.log('Login failed:', response.message || 'Unknown error');
                        return null;

                    } catch (error) {
                        console.error('Auth Service Error:', error);
                        return null;
                    }
                }

                console.log('Invalid credentials format');
                return null;
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            // Runs on initial login when 'user' is present
            if (user) {
                token.id = user.id;
                token.accessToken = user.accessToken;
            }
            return token;
        },
        async session({ session, token }) {
            // Runs on every session check
            if (token && session.user) {
                session.user.id = token.id as string;
                session.user.accessToken = token.accessToken as string;
            }
            return session;
        },
    },
});
