'use client';

import type {Bot} from '@/types/bot';

import {useEffect, useRef} from 'react';
import clsx from 'clsx'; // A utility for constructing className strings conditionally

import {BotDetailsCard} from './BotDetailsCard';
import {
    PauseIcon, PlayIcon, CloseIcon, MetricsIcon,
    RuntimeIcon, TransactionsIcon, SuccessRateIcon
} from './Icons';


interface BotCardProps {
    bot: Bot;
    onDelete?: (id: number) => void;
    onPause?: (id: number) => void;
    onToggleMetrics?: (id: number) => void;
}

export const BotCard = ({bot, onDelete, onPause, onToggleMetrics}: BotCardProps) => {
    const isPaused = bot.status === 'paused';
    const pnlIsPositive = bot.pnlPerc >= 0;
    const pulseColor = isPaused ? 'bg-accent-pause' : 'bg-accent-lime';

    // Marquee effect logic
    const titleRef = useRef<HTMLHeadingElement>(null);
    const spanRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        const title = titleRef.current;
        const span = spanRef.current;

        if (title && span && span.scrollWidth > title.clientWidth) {
            title.classList.add('can-marquee');
            const scrollAmount = span.scrollWidth - title.clientWidth;

            title.style.setProperty('--scroll-amount', `${scrollAmount}px`);
        } else {
            title?.classList.remove('can-marquee');
        }
    }, [bot.name]);

    return (
        <div
            className={clsx(
                'bot-card rounded-xl bg-bg-card hover:border-text-secondary',
                {
                    'p-4 border border-white/40': onDelete,
                    'expanded': bot.isExpanded,
                    'new-bot-enter': bot.isNew,
                    'deleting': bot.isDeleting,
                }
            )}
        >
            <div className="grid grid-cols-[1fr_16rem_14rem] items-center w-full h-full gap-x-8">
                {/* Section 1: Name Part */}
                <div className="flex items-center gap-4 min-w-0">
                    <span className="relative flex h-3 w-3 flex-shrink-0">
                        {!isPaused && <span
                            className={`animate-ping absolute inline-flex h-full w-full rounded-full ${pulseColor} opacity-75`} />}
                        <span className={`relative inline-flex rounded-full h-3 w-3 ${pulseColor}`} />
                    </span>
                    <div className="min-w-0 flex-1">
                        <h4 ref={titleRef} className="text-lg font-bold text-white truncate">
                            <span ref={spanRef} className="inline-block">{bot.name}</span>
                        </h4>
                        <p className="text-xs capitalize text-text-secondary">{bot.status} | {bot.pair}</p>
                    </div>
                </div>

                {/* Section 2: Info Part */}
                <div className="hidden sm:flex items-center justify-center gap-x-6 text-xs">
                    <div className="flex items-center gap-1.5" title="Runtime">
                        <RuntimeIcon/> <span className="text-white font-medium">{bot.runtime}</span>
                    </div>
                    <div className="flex items-center gap-1.5" title="Transactions">
                        <TransactionsIcon/> <span className="text-white font-medium">{bot.transactions}</span>
                    </div>
                    <div className="flex items-center gap-1.5" title="Success Rate">
                        <SuccessRateIcon/> <span className="text-white font-medium">{bot.successRate}%</span>
                    </div>
                </div>

                {/* Section 3: PNL & Actions Part */}
                <div className="flex items-center justify-end gap-4">
                    <div className="text-right">
                        <p className={clsx('text-lg font-bold', pnlIsPositive ? 'text-accent-green' : 'text-red-500')}>
                            {pnlIsPositive ? '+' : ''}{bot.pnlPerc?.toFixed(2)}%
                        </p>
                        <p className="text-xs text-text-secondary">
                            {pnlIsPositive ? '+' : ''}${Math.abs(bot.pnlValue).toFixed(2)}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {onPause &&
                            <button
                                className={clsx('p-2 rounded-md transition-colors hover:opacity-80 flex-shrink-0', isPaused ? 'bg-accent-pause' : 'bg-border')}
                                title={isPaused ? 'Resume Bot' : 'Pause Bot'}
                                onClick={() => onPause(bot.id)}
                            >
                                {isPaused ? <PlayIcon/> : <PauseIcon/>}
                            </button>
                        }
                        {onDelete &&
                            <button
                                className="p-2 rounded-md transition-colors bg-border hover:bg-red-800/50"
                                title="Close Bot"
                                onClick={() => onDelete(bot.id)}
                            >
                                <CloseIcon/>
                            </button>
                        }
                        {onToggleMetrics &&
                            <button
                                className="p-2 rounded-md transition-all duration-300 hover:bg-white/10 flex-shrink-0"
                                title="View Metrics"
                                onClick={() => onToggleMetrics(bot.id)}
                            >
                                <MetricsIcon isExpanded={!!bot.isExpanded}/>
                            </button>
                        }
                    </div>
                </div>
            </div>
            {!onDelete &&
                <div className="flex items-center justify-center w-full border-t-1 border-gray-700 my-6" />
            }
            <BotDetailsCard bot={bot}/>
        </div>
    );
};
