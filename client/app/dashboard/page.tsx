import { CandleChart } from '@/components/CandleChart';
import { BotCard } from '@/components/BotCard';
import { getApiClient } from '@/lib/api';
import { Bot, Candle } from '@/types';

export default async function DashboardPage() {
    const api = getApiClient();
    const [bots, candles] = await Promise.all([
        api.get<Bot[]>('/bots'),
        api.get<Candle[]>('/candles/BTC/USDT/1h')
    ]);

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-8">Trading Dashboard</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {bots.data.map(bot => (
                    <BotCard key={bot.id} bot={bot} />
                ))}
            </div>

            <div className="p-4 rounded-lg shadow">
                <h2 className="text-xl mb-4">BTC/USDT 1H Chart</h2>
                <CandleChart data={candles.data} />
            </div>
        </div>
    );
}
