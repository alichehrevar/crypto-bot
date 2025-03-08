// app/lib/api.ts
export function getApiClient() {
    const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000/api';

    return {
        get: async (path: string) => {
            const res = await fetch(`${baseUrl}${path}`);
            if (!res.ok) {
                throw new Error('API request failed');
            }
            const data = await res.json();
            return { data };
        },
        // You can add post, put, delete, etc.
    };
}
