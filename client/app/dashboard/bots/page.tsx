import { BotCard } from "@/components/BotCard"; // adjust the import path as needed

// Define the Bot type. Adjust properties as needed.
interface Bot {
    _id: string;
    id: string;
    name: string;
    strategy: string;
    symbol: string;
    timeframe: string;
    active: boolean;
}

// This page is a Server Component (default in Next.js 13's App Router).
export default async function BotsPage() {
    // Use fetch to get data from your backend.
    // You might store your API URL in an environment variable; here we default to localhost.
    const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const res = await fetch(`${apiUrl}/bots`, { cache: "no-store" });
    if (!res.ok) {
        const errorText = await res.text();
        console.error("Error fetching bots:", res.status, errorText);
        throw new Error("Failed to fetch bots");
    }
    const bots: Bot[] = await res.json();

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Bots</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {bots.map((bot) => (
                    <BotCard key={bot.id || bot._id} bot={bot} />
                ))}
            </div>
        </div>
    );
}
