import { BotCard } from "@/components/BotCard";

interface Bot {
    _id: string;
    id: string;
    name: string;
    strategy: string;
    symbol: string;
    timeframe: string;
    active: boolean;
}

export default async function BotsPage({ searchParams }: { searchParams: { symbol?: string; timeframe?: string } }) {
    // Get symbol and timeframe from query parameters; use defaults if not provided.
    const rawSymbol = searchParams.symbol || 'BTCUSDT';
    const timeframe = searchParams.timeframe || '1h';

    // Normalize the symbol.
    let symbol = rawSymbol;
    if (!rawSymbol.includes('/')) {
        const upperSymbol = rawSymbol.toUpperCase();
        // Define known quote currencies.
        const knownQuotes = ['USDT', 'USDC', 'BTC', 'ETH', 'BNB', 'TRY', 'USD'];
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

    // Get backend URL from environment variable or fallback.
    const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const endpoint = `${apiUrl}/bots/select?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}`;

    console.log('Fetching bot data from:', endpoint);

    const res = await fetch(endpoint, { cache: 'no-store' });
    console.log('Response status:', res.status);
    if (!res.ok) {
        const errorText = await res.text();
        console.error('Error fetching bot data:', errorText);
        throw new Error("Failed to fetch bot data");
    }
    const bots: Bot[] = await res.json();
    console.log('Fetched bots:', bots);

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Bots for {symbol} - {timeframe}</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {bots.map((bot) => (
                    <BotCard key={bot.id} bot={bot} />
                ))}
            </div>
        </div>
    );
}
