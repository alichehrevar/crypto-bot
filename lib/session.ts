// /lib/session.ts
import { cookies } from 'next/headers';
import { jwtVerify, JWTPayload } from 'jose';

type Role = 'admin' | 'client';
type TokenPayload = JWTPayload & { sub: string; role: Role };

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export async function getSession(): Promise<{ userId: string | null; role: Role | null }> {
    const token = (await cookies()).get('token')?.value;

    if (!token) return { userId: null, role: null };

    try {
        const { payload } = await jwtVerify<TokenPayload>(token, secret);

        return {
            userId: (payload.sub as string) ?? null,
            role: (payload.role as Role) ?? null,
        };
    } catch {
        return { userId: null, role: null };
    }
}
