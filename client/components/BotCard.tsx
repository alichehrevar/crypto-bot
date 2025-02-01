interface BotCardProps {
    bot: {
        id: string;
        name: string;
        strategy: string;
        symbol: string;
        timeframe: string;
        active: boolean;
    };
}

export function BotCard({ bot }: BotCardProps) {
    return (
        <div className="p-4 rounded-lg shadow hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold">{bot.name}</h3>
                <span className={`inline-block w-3 h-3 rounded-full ${bot.active ? 'bg-green-500' : 'bg-red-500'}`} />
            </div>

            <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                    <span className="text-gray-500">Symbol:</span>
                    <span className="font-mono">{bot.symbol}</span>
                </div>

                <div className="flex justify-between">
                    <span className="text-gray-500">Strategy:</span>
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
            {bot.strategy}
          </span>
                </div>
            </div>
        </div>
    );
}
