import { BotCard } from "@/components/BotCard";
import BotUpdates, { Bot } from "@/components/BotUpdates";

export default async function BotsPage({ searchParams }: { searchParams: { symbol?: string; timeframe?: string } }) {
    // Get symbol and timeframe from query parameters; use defaults if not provided.
    const rawSymbol = searchParams.symbol || 'BTCUSDT';
    const timeframe = searchParams.timeframe || '1h';

    // Normalize symbol (convert "BTCUSDT" to "BTC/USDT" if needed).
    let symbol = rawSymbol;
    if (!rawSymbol.includes('/')) {
        const upperSymbol = rawSymbol.toUpperCase();
        // Define known quote currencies.
        const knownQuotes = ['USDT', 'USDC', 'BTC', 'ETH', 'BNB', 'TRY'];
        let matchedQuote = null;
        for (const quote of knownQuotes) {
            if (upperSymbol.endsWith(quote)) {
                matchedQuote = quote;
                break;
            }
        }
        if (matchedQuote) {
            // Insert a slash before the matched quote.
            symbol = upperSymbol.slice(0, upperSymbol.length - matchedQuote.length) + '/' + matchedQuote;
        } else {
            // If no known quote currency is detected, fallback to the uppercase symbol.
            symbol = upperSymbol;
        }
    }

    const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000/api';
    const endpoint = `${apiUrl}/bots/select?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}`;

    console.log('Fetching bot data from:', endpoint);

    const res = await fetch(endpoint, { cache: 'no-store' });
    if (!res.ok) {
        const errorText = await res.text();
        console.error('Error fetching bot data:', errorText);
        throw new Error("Failed to fetch bot data");
    }
    // The bots from the backend will have _id instead of id.
    const bots: any[] = await res.json();
    console.log('Fetched bots:', bots);

    // Normalize each bot by mapping _id to id.
    const normalizedBots: Bot[] = bots.map(bot => ({
        id: bot._id.toString(),
        ...bot
    }));

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Bots for {symbol} - {timeframe}</h1>
            {/* Render initial bots with BotCard */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {normalizedBots.map((bot) => (
                    <BotCard key={bot.id} bot={bot} />
                ))}
            </div>
            {/* Include the BotUpdates component for live updates */}
            <h2 className="text-xl font-bold mt-8">Live Updates</h2>
            <BotUpdates initialBots={normalizedBots} />
        </div>
    );
}
