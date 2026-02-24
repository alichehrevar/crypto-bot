// actions/put.ts
'use server';
import { auth, signOut } from "@/lib/auth";

// Pure generic <T> with no 'any' fallback.
// TypeScript will infer T from the data you pass in.
export async function updateRequest<T>(body: T | FormData, url: string): Promise<unknown> {
    const session = await auth();

    try {
        const response = await fetch(process.env.API_URL! + '/api' + url, {
            method: 'PUT',
            headers: {
                Accept: 'application/json',
                'Authorization': `Bearer ${session?.user?.accessToken}`,
                // Dynamically drop Content-Type if FormData so the browser can set the boundary
                ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
            },
            // Safely stringify only if it's a standard object
            body: body instanceof FormData ? body : JSON.stringify(body),
        });

        const responseJson = await response.json();

        if (responseJson.success === false && responseJson.error === "Token is invalid or expired.") {
            console.log("Session expired. Redirecting to login...");
            await signOut({ redirectTo: '/login' });
        }

        return responseJson;
    } catch (error: unknown) {
        throw error;
    }
}
