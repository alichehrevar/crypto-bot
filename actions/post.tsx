'use server';
import { cookies } from "next/headers";

export async function sendRequest(body: { [p: string]: File | string } | FormData, url: string) {
    const nextCookies = await cookies();

    try {
        const response = await fetch(process.env.API_URL! + '/api' + url, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                Authorization: `Bearer ${nextCookies?.get('token')?.value}`,
                ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
            },
            body: body instanceof FormData ? body : JSON.stringify(body),
        })

        const responseJson = await response.json()

        if (responseJson.data?.token) {
            const cookieStore = await cookies()

            cookieStore.set('token', responseJson.data.token, {
                httpOnly: false,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 60 * 60 * 24, // 1 month
                path: '/'
            })
        }

        return responseJson
    } catch (error) {
        throw error
    }
}

export async function logoutAction(url: string) {
    const nextCookies = await cookies();

    try {
        const response = await fetch(process.env.API_URL! + '/api' + url, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: `Bearer ${nextCookies?.get('token')?.value}`,
            },
        })

        return response.json()
    } catch (error) {
        throw error
    }
}
