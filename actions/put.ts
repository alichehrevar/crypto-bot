'use server';
import { cookies } from "next/headers";

export async function updateRequest (body: { [p: string]: File | string }, url: string) {
    const nextCookies = await cookies();

    try {
        const response = await fetch(process.env.API_URL! + '/api' + url, {
            method: 'PUT',
            headers: {
                Accept: 'application/json',
                'Authorization': `Bearer ${nextCookies?.get('token')?.value}`,
                ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
            },
            body: JSON.stringify(body),
        })

        return await response.json()
    } catch (error) {
        throw error
    }
}
