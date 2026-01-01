'use server';
import {auth, signOut} from "@/lib/auth";

export async function updateRequest (body: { [p: string]: File | string }, url: string) {
    const session = await auth();

    try {
        const response = await fetch(process.env.API_URL! + '/api' + url, {
            method: 'PUT',
            headers: {
                Accept: 'application/json',
                'Authorization': `Bearer ${session?.user?.accessToken}`,
                ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
            },
            body: JSON.stringify(body),
        })

        const responseJson = await response.json()

        if (responseJson.success === false && responseJson.error === "Token is invalid or expired.") {
            console.log("Session expired. Redirecting to login...");
            await signOut({ redirectTo: '/login' });
        }

        return responseJson
    } catch (error) {
        throw error
    }
}
