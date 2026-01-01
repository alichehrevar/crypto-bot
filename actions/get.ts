"use server";

import {auth, signOut} from "@/lib/auth";

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

        const responseJson = await response.json()

        if (responseJson.success === false && responseJson.error === "Token is invalid or expired.") {
            console.log("Session expired. Redirecting to login...");
            await signOut({ redirectTo: '/login' });
        }

        return responseJson
    } catch (e) {
        throw e
    }
}
