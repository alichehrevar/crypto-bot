// app/types/index.ts

/**
 * Bot Interface
 *
 * This interface defines the expected structure of a Bot object.
 * It includes basic bot details along with market information.
 */
// types/Bot.ts

/**
 * Interface representing a trading bot.
 */
export interface Bot {
    // Unique identifier for the bot.
    _id: string;
    id: string;
    // Bot's name (e.g., "BTC/USDT 1h MACD Bot").
    name: string;
    // The overall trading strategy used by the bot.
    strategy: string;
    // The symbol being traded (e.g., "BTC/USDT").
    symbol: string;
    // The timeframe used for trading (e.g., "1h").
    timeframe: string;
    active: boolean;
    // The primary technical indicator used (e.g., "RSI", "MACD", etc.).
    indicator?: string;
    // The risk (money management) strategy used (e.g., "KellyCriterionStrategy", "MartingaleStrategy", etc.).
    riskStrategy?: string;
    // The base fund amount in dollars.
    baseFund: number;
    // The current paper balance (starting balance for paper trading).
    paperBalance: number;
    // The trade fund expressed as a percentage (portion of baseFund allocated for trading).
    tradeFund: number;
    // The leverage used (e.g., 1 means 1x leverage).
    leverage: number;
    // Market information including candle data and the latest signal.
    marketInfo?: {
        // The last computed trading signal (e.g., "BUY", "SELL", or "HOLD").
        lastSignal?: string;
        // Data for the last closed (finalized) candle.
        lastCandle?: {
            close: number;
            timestamp?: string | Date;
            open?: number;
            high?: number;
            low?: number;
            volume?: number;
        };
        baseFund: number; // Base fund in dollars.
        tradeFund: number; // Trade fund percentage.
        // Data for the current (live) candle price.
        currentCandle?: {
            price: number;
        };
    } | null;
    // Cumulative profit and loss accumulated by the bot.
    cumulativePnL?: number;
    // Bot-level take profit threshold (if reached, the bot stops trading).
    botTP?: number;
    // Bot-level stop loss threshold (if reached, the bot stops trading).
    botSL?: number;
    // Risk management parameters.
    riskParams?: {
        maxDrawdown?: number;
        dailyLossLimit?: number;
        positionSizingMethod?: 'compound' | 'simple';
        // For compound method: fraction of the balance to risk.
        riskFraction?: number;
        // For compound method: stop loss distance as a fraction (e.g., 0.02 for 2%).
        stopLossDistance?: number;
        // For simple method: type and fixed value.
        positionSizeType?: 'percentage' | 'fixed';
        positionSizeValue?: number;
        maxOpenTrades?: number;
    };
    // Trade configuration information.
    tradeInfo?: {
        takeProfit?: number;
        stopLoss?: number;
        leverage?: number;
        side?: 'buy' | 'sell';
        positionSide?: 'long' | 'short';
        winProbability?: number;
        payoffRatio?: number;
        lastTradeOutcome?: string;
        // This field duplicates riskParams.positionSizingMethod; you can choose to use one.
        positionSizingMethod?: 'compound' | 'simple';
        tradingStrategy?: 'default' | 'optimized' | 'dynamic';
        optimizationMethod?: 'grid' | 'bayesian' | 'ann';
        minimumTrade?: number;
        minimumWinRatio?: number;
        minimumAccuracy?: number;
        configId?: string;
        signalProcessingMethod?: 'weighted' | 'consensus';
    };
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
