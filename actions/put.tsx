'use server';
import { cookies } from "next/headers";

export async function updateRequest (body: BodyInit | null, url: string) {
    const nextCookies = await cookies();

    try {
        const response = await fetch(process.env.API_URL! + '/api/v2' + url, {
            method: 'PUT',
            headers: {
                Accept: 'application/json',
                loginToken: `${nextCookies?.get('TOKEN')?.value}`,
                ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
            },
            body: JSON.stringify(body),
        })

        return await response.json()
    } catch (error) {
        throw error
    }
}
