'use client';

import type { Bot } from '@/types/bot';

import { useState } from 'react';


import { BotCard } from './BotCard';
import { EmptyState } from './EmptyState';
import { DeployIcon, ExpandViewIcon } from './Icons';

import { initialBotsData } from '@/data/bots'; // We'll move the data to a separate file

export const ActiveBots = () => {
    const [bots, setBots] = useState<Bot[]>(initialBotsData);

    const handleDeployNewBot = () => {
        const newBot: Bot = {
            id: Date.now(),
            name: 'AI Grid Bot v1.3 with Ultra Low Latency Execution',
            pair: 'LINK/USDT',
            leverage: '4x',
            runtime: '0h 1m',
            transactions: 0,
            successRate: 0,
            pnlPerc: 0.00,
            pnlValue: 0.00,
            status: 'active',
            isNew: true,
            strategy: 'AI Adaptive Grid',
            initialCapital: 3000,
            avgHoldTime: 'N/A',
            deploymentDate: new Date().toISOString().slice(0, 16).replace('T', ' '),
            winRate: 0,
            sharpeRatio: 0,
            lastSignalAction: '---',
            marketType: 'Future',
            marginType: 'Isolated',
            positionMode: 'Single',
            tp: 50,
            sl: 25,
            trades: []
        };

        setBots(prevBots => [newBot, ...prevBots]);

        // This mimics the original's animation logic
        setTimeout(() => {
            setBots(prev => prev.map(b => b.id === newBot.id ? { ...b, isNew: false } : b));
        }, 20);
    };

    const handleDeleteBot = (botId: number) => {
        // Add deleting state for CSS animation
        setBots(prev => prev.map(b => b.id === botId ? { ...b, isDeleting: true } : b));
        // Remove from state after animation
        setTimeout(() => {
            setBots(prev => prev.filter(bot => bot.id !== botId));
        }, 500); // Corresponds to animation duration
    };

    const handlePauseBot = (botId: number) => {
        setBots(prev => prev.map(bot => {
            if (bot.id === botId) {
                return { ...bot, status: bot.status === 'active' ? 'paused' : 'active' };
            }

            return bot;
        }));
    };

    const handleToggleMetrics = (botId: number) => {
        setBots(prev => {
            const wasExpanded = prev.find(b => b.id === botId)?.isExpanded;

            return prev.map(b => ({
                ...b,
                isExpanded: b.id === botId ? !wasExpanded : false
            }));
        });
    };

    return (
        <div className="w-full max-w-screen-xl mx-auto my-auto">
            <div className="rounded-xl p-6 border h-full bg-bg-card border-border">
                <div className="flex items-center justify-between w-full mb-6">
                    <h3 className="text-lg font-bold text-white">My Bots</h3>
                    <div className="flex items-center gap-3">
                        <button className="text-text-secondary hover:text-white transition-colors" title="Expand View">
                            <ExpandViewIcon />
                        </button>
                        <button
                            className="flex items-center gap-2 hover:opacity-90 transition-all duration-300 bg-white text-bg-primary py-2 px-4 rounded-lg font-medium text-sm cursor-pointer"
                            onClick={handleDeployNewBot}
                        >
                            <span>Deploy New</span>
                            <DeployIcon />
                        </button>
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    {bots.length > 0 ? (
                        bots.map(bot => (
                            <BotCard
                                key={bot.id}
                                bot={bot}
                                onDelete={handleDeleteBot}
                                onPause={handlePauseBot}
                                onToggleMetrics={handleToggleMetrics}
                            />
                        ))
                    ) : (
                        <EmptyState />
                    )}
                </div>
            </div>
        </div>
    );
};
