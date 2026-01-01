"use server";

import { auth } from "@/lib/auth";

export async function getData (url: string, isLogFile: boolean = false) {
    const session = await auth();

    // build headers
    const headers: Record<string,string> = {
        Authorization: `Bearer ${session?.user?.accessToken}`
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
