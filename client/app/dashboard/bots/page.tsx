import { getApiClient } from '@/lib/api';
import { Bot } from '@/types';
import { BotCard } from '@/components/BotCard';

export default async function BotsPage() {
    const api = getApiClient();
    const bots = await api.get<Bot[]>('/bots');

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bots.data.map(bot => (
                <BotCard key={bot.id} bot={bot} />
            ))}
        </div>
    );
}
