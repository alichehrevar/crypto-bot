'use server';

import { signIn, signOut } from '@/lib/auth';
import { AuthError } from 'next-auth';

// Handle Login
export async function authenticate(prevState: string | undefined, formData: FormData) {
    try {
        // NextAuth "credentials" provider will automatically pick up
        // fields named "email" and "password" from formData.
        // Any extra fields (lat, lng) are passed to the authorize() callback in lib/auth.ts
        await signIn('credentials', formData);
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case 'CredentialsSignin':
                    return 'Invalid credentials. Access Denied.';
                default:
                    return 'Something went wrong.';
            }
        }
        throw error;
    }
}

// Handle Logout
export async function logout() {
    await signOut({ redirectTo: '/login' });
}
