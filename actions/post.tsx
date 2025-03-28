'use server';
import { cookies } from "next/headers";

export async function sendRequest(body: { [p: string]: File | string }, url: string) {
    const nextCookies = await cookies();

    try {
        const response = await fetch(process.env.API_URL! + '/api' + url, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                loginToken: `${nextCookies?.get('TOKEN')?.value}`,
                ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
            },
            body: JSON.stringify(body),
        })

        const responseJson = await response.json()

        if (responseJson.status && responseJson.token) {
            const cookieStore = await cookies()

            cookieStore.set('token', responseJson.token, {
                httpOnly: false,
                secure: true,
                maxAge: 60 * 60 * 24 * 180, // 6 months
                path: '/'
            })
        }

        return responseJson
    } catch (error) {
        throw error
    }
}
