import { CandleChart } from '@/components/CandleChart';

// Suppose you fetch initial candle data on the server
export default async function CandlePage() {
    // Fetch initial historical candle data from your backend API
    const res = await fetch(process.env.NEXT_PUBLIC_BACKEND_URL + '/candles', { cache: 'no-store' });
    const initialData = await res.json();

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Live Candle Chart</h1>
            <CandleChart initialData={initialData} />
        </div>
    );
}
