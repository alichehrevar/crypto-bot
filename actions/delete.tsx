'use server';
import { cookies } from "next/headers";

export async function deleteRequest(body: { [p: string]: File | string }, url: string) {
    const nextCookies = await cookies();

    try {
        const response = await fetch(process.env.API_URL! + '/api' + url, {
            method: 'DELETE',
            headers: {
                Accept: 'application/json',
                Authorization: `${nextCookies?.get('token')?.value}`,
                ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
            },
            body: JSON.stringify(body),
        })

        const responseJson = await response.json()

        if (responseJson.token) {
            const cookieStore = await cookies()

            cookieStore.set('token', responseJson.token, {
                httpOnly: false,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 60 * 60 * 24 * 180, // 6 months
                path: '/'
            })
        }

        return responseJson
    } catch (error) {
        throw error
    }
}
