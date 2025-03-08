// app/types/index.ts

/**
 * Bot Interface
 *
 * This interface defines the expected structure of a Bot object.
 * It includes basic bot details along with market information.
 */
export interface Bot {
    // Unique identifier for the bot.
    id: string;
    // Bot's name (e.g., "BTC/USDT 1h MACD Bot").
    name: string;
    // The trading strategy used by the bot.
    strategy: string;
    // The symbol being traded (e.g., "BTC/USDT").
    symbol: string;
    // The timeframe used (e.g., "1h").
    timeframe: string;
    // Primary indicator used by the bot (e.g., "RSI", "MACD", etc.). Optional.
    indicator?: string;
    // Money management or risk strategy (e.g., "MartingaleStrategy"). Optional.
    riskStrategy?: string;
    // The base fund amount in dollars.
    baseFund: number;
    // The trade fund expressed as a percentage.
    tradeFund: number;
    // The leverage used (e.g., 1 means 1x).
    leverage: number;
    // Market information including candle data and last signal.
    marketInfo?: {
        // The last computed trading signal (e.g., "BUY", "SELL", or "HOLD").
        lastSignal?: string;
        // Data for the last closed candle.
        lastCandle?: {
            close: number;
            timestamp?: string | Date;
            open?: number;
            high?: number;
            low?: number;
            volume?: number;
        };
        // Data for the currently active candle.
        currentCandle?: {
            price: number;
        };
    } | null;
}

/**
 * LiveBot Interface
 *
 * This interface defines the shape of live bot update data.
 * It includes properties such as:
 * - id: A unique identifier for the bot.
 * - name: The name of the bot (e.g., "BTC/USDT 1h MACD Bot").
 * - status: The current status of the bot (active, closed, paused, or canceled).
 * - strategy: The technical strategy used (e.g., "MACD", "RSI").
 * - symbol: The trading symbol (e.g., "BTC/USDT").
 * - tradeFund: The portion of funds allocated for trading, expressed as a percentage.
 * - leverage: The leverage used (e.g., 1x, 10x).
 * - riskCriterion: A description of the risk management method.
 * - technicalValue: A technical indicator value (e.g., "RSI: 43").
 * - signal: The current aggregated trading signal ("BUY", "SELL", or "HOLD").
 * - pnl: The current profit and loss for the bot.
 */
export interface LiveBot {
    id: string;
    name: string;
    status: 'active' | 'closed' | 'paused' | 'canceled';
    strategy: string;
    symbol: string;
    tradeFund: number;
    leverage: number;
    riskCriterion: string;
    technicalValue: string;
    signal: string;
    pnl: number;
}


export interface User {
    id: string;
    email: string;
    createdAt: Date;
}
