import type { Bot, Trade } from '@/types/bot';

const DetailItem = ({ label, value }: { label: string, value: React.ReactNode }) => (
    <div>
        <p className="text-xs text-text-secondary">{label}</p>
        <p className="font-medium text-white">{value}</p>
    </div>
);

const TradeRow = ({ trade }: { trade: Trade }) => (
    <tr>
        <td className={`capitalize font-medium ${trade.type === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
            {trade.type}
        </td>
        <td>${trade.price.toFixed(2)}</td>
        <td className={trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
            {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}
        </td>
        <td>{trade.time}</td>
    </tr>
);

export const BotDetails = ({ bot }: { bot: Bot }) => {
    const formattedDate = bot.deploymentDate.replace(/-/g, '.').slice(0, 16);
    const tpHtml = bot.tp ? <span className="font-medium text-green-400">{bot.tp}%</span> : '-';
    const slHtml = bot.sl ? <span className="font-medium text-red-400">{bot.sl}%</span> : '-';

    return (
        <div className="bot-details">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6 text-sm">
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <DetailItem label="Strategy" value={bot.strategy} />
                        <DetailItem label="Initial Capital" value={`$${bot.initialCapital.toLocaleString()}`} />
                        <DetailItem label="Deployment" value={formattedDate} />
                        <DetailItem label="Avg. Hold Time" value={bot.avgHoldTime} />
                        <DetailItem label="Win Ratio" value={`${bot.winRate}%`} />
                        <DetailItem label="Sharpe Ratio" value={bot.sharpeRatio} />
                        <DetailItem label="Type" value={bot.marketType} />
                        <DetailItem label="Leverage" value={bot.marketType === 'Future' ? bot.leverage : '-'} />
                        <DetailItem label="TP/SL" value={<>{tpHtml} / {slHtml}</>} />
                        <DetailItem label="Margin" value={bot.marginType || '-'} />
                        <DetailItem label="Position" value={bot.positionMode || '-'} />
                        <DetailItem label="Last Action" value={bot.lastSignalAction} />
                    </div>
                </div>

                <div className="lg:col-span-2">
                    <p className="text-xs mb-2 text-text-secondary">Recent Trades</p>
                    <div className="max-h-40 overflow-y-auto pr-2">
                        {bot.trades.length > 0 ? (
                            <table className="w-full text-xs trades-table">
                                <thead>
                                <tr>
                                    <th className="py-1 px-2 text-left text-text-secondary font-medium">Type</th>
                                    <th className="py-1 px-2 text-left text-text-secondary font-medium">Price</th>
                                    <th className="py-1 px-2 text-left text-text-secondary font-medium">PNL ($)</th>
                                    <th className="py-1 px-2 text-left text-text-secondary font-medium">Time</th>
                                </tr>
                                </thead>
                                <tbody>
                                {bot.trades.map((trade, index) => <TradeRow key={index} trade={trade} />)}
                                </tbody>
                            </table>
                        ) : (
                            <div className="text-center py-8 text-sm text-text-secondary">No trades recorded yet.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
