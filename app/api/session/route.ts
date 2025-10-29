// app/api/session/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
    const token = (await cookies()).get('token')?.value;

    if (!token) return NextResponse.json({ role: null, userId: null }, { status: 200 });

    try {
        const resp = await fetch(`${process.env.API_URL}/api/session`, {
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
            cache: 'no-store',
        });

        if (!resp.ok) return NextResponse.json({ role: null, userId: null }, { status: 200 });

        const json = await resp.json(); // { success, data:{ role, userId } }

        return NextResponse.json(
            { role: json?.data?.role ?? null, userId: json?.data?.userId ?? null },
            { status: 200 }
        );
    } catch {
        return NextResponse.json({ role: null, userId: null }, { status: 200 });
    }
}
