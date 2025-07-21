"use server";

import {cookies} from "next/headers";

export async function getData (url: string, isLogFile: boolean = false) {
    const nextCookies = await cookies();

    // build headers
    const headers: Record<string,string> = {
        Authorization: `Bearer ${nextCookies?.get('token')?.value}`
    };
    // only send JSON content‐type if *not* a log file
    if (!isLogFile) {
        headers['Content-Type'] = 'application/json';
    }

    try {
        const response = await fetch(process.env.API_URL! + '/api'  + url, {
            method: 'get',
            headers,
            // next: { revalidate: 2 }
        })

        if (isLogFile) return response.text()

        return response.json()
    } catch (e) {
        throw e
    }
}
