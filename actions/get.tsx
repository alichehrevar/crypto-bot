"use server";

import {cookies} from "next/headers";

export async function getData (url: string) {
    const nextCookies = await cookies();

    try {
        const response = await fetch(process.env.API_URL! + '/api/v2'  + url, {
            method: 'get',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${nextCookies?.get('token')?.value}`
            },
            next: { revalidate: 60 }
        })

        return response.json()
    } catch (e) {
        throw e
    }
}
