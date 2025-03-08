// app/components/BotList.tsx
'use client';

import React from 'react';
import { Bot } from '@/types';

/**
 * BotListProps defines the properties for the BotList component.
 */
interface BotListProps {
    bots: Bot[];
}

/**
 * BotList component displays a list of deployed bots.
 *
 * Each bot is rendered with its key details.
 * The unique key for each item is obtained from either bot.id or bot._id.
 */
export default function BotList({ bots }: BotListProps) {
    return (
        <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4">Deployed Bots</h2>
            {bots.length > 0 ? (
                <ul className="space-y-4">
                    {bots.map((bot) => (
                        <li
                            key={bot.id || (bot as any)._id}
                            className="border p-4 rounded"
                        >
                            <p>
                                <strong>Name:</strong> {bot.name}
                            </p>
                            <p>
                                <strong>Symbol:</strong> {bot.symbol}
                            </p>
                            <p>
                                <strong>Timeframe:</strong> {bot.timeframe}
                            </p>
                            <p>
                                <strong>Indicator:</strong> {bot.indicator || 'N/A'}
                            </p>
                            <p>
                                <strong>Risk Strategy:</strong> {bot.riskStrategy || 'N/A'}
                            </p>
                            <p>
                                <strong>Strategy:</strong> {bot.strategy}
                            </p>
                            <p>
                                <strong>Base Fund ($):</strong> {bot.paperBalance ? bot.paperBalance.toLocaleString('en-EN') : 'N/A'}
                            </p>
                            <p>
                                <strong>Trade Fund (%):</strong> {bot.tradeFund !== undefined ? `${bot.tradeFund}%` : 'N/A'}
                            </p>
                            <p>
                                <strong>Leverage:</strong> {bot.leverage ? `${bot.leverage}x` : 'N/A'}
                            </p>
                            <p>
                                <strong>Last Signal:</strong>{' '}
                                {bot.marketInfo?.lastSignal || 'HOLD'}
                            </p>
                            <p>
                                <strong>Last Closed Candle Price:</strong>{' '}
                                {bot.marketInfo?.lastCandle ? bot.marketInfo.lastCandle.close : 'N/A'}
                            </p>
                            <p>
                                <strong>Current Candle Price:</strong>{' '}
                                {bot.marketInfo?.currentCandle ? bot.marketInfo.currentCandle.price : 'N/A'}
                            </p>
                        </li>
                    ))}
                </ul>
            ) : (
                <p>No bots deployed yet.</p>
            )}
        </div>
    );
}
