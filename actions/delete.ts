'use server';

import {auth} from "@/lib/auth";

export async function deleteRequest(body: { [p: string]: File | string }, url: string) {
    const session = await auth();

    try {
        const response = await fetch(process.env.API_URL! + '/api' + url, {
            method: 'DELETE',
            headers: {
                Accept: 'application/json',
                Authorization: `Bearer ${session?.user?.accessToken}`,
                ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
            },
            body: JSON.stringify(body),
        })

        return await response.json()
    } catch (error) {
        throw error
    }
}
