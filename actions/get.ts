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

/**
 * Dedicated method for downloading raw log files as text.
 * Handles auth headers server-side to keep tokens secure.
 */
export async function downloadLog(url: string) {
    const session = await auth();

    const headers: Record<string, string> = {
        Authorization: `Bearer ${session?.user?.accessToken}`
    };

    try {
        const response = await fetch(process.env.API_URL! + '/api' + url, {
            method: 'GET',
            headers,
            cache: 'no-store'
        });

        if (response.status === 401) {
            console.log("Session expired during download. Redirecting...");
            await signOut({ redirectTo: '/login' });
            return null;
        }

        if (!response.ok) {
            throw new Error(`Download failed: ${response.status} ${response.statusText}`);
        }

        // FIX: Read as ArrayBuffer (Binary) instead of Text
        const arrayBuffer = await response.arrayBuffer();

        // Convert to Base64 string to safely pass to Client Component
        return Buffer.from(arrayBuffer).toString('base64');

    } catch (e) {
        console.error("Server Action Download Error:", e);
        throw e;
    }
}
