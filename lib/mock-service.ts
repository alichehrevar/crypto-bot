// lib/mock-service.ts
// This service centralizes all random data generation

// --- Interfaces ---

export interface SystemMetric {
    name: string;
    mrr: number;
    users: number;
    newUsers: number;
    basic: number;
    essential: number;
    pro: number;
    technical: number;
    grid: number;
    dca: number;
    ai: number;
    trades: number;
}

export interface ActivityLog {
    action: string;
    details: string;
    time: string;
    ip: string | null;
}

export interface MockUser {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    country: string;
    plan: 'BASIC' | 'ESSENTIAL' | 'PRO';
    planFreq: 'MONTHLY' | 'ANNUAL';
    botCount: number;
    birthday: string;
    joinedAt: string;
    balance: string;
    status: 'ACTIVE' | 'SUSPENDED';
    avatar: string;
    brokers: string[];
    billingAddress: string;
    session: {
        city: string;
        region: string;
        country: string;
        timezone: string;
        ip: string;
    };
    activityHistory: ActivityLog[];
}

export interface BotMetrics {
    roi: string;
    drawdown: string;
    winRate: string;
    sharpe: string;
    profitFactor: string;
    totalTrades: number;
}

export interface IndicatorConfig {
    name: string;
    tf: string;
    params: string;
}

export interface MockBot {
    id: string;
    name: string;
    type: string;
    status: string;
    symbol: string;
    strategy: string;
    runtime: string;
    pnl: string;
    startedAt: string;
    exchange: string;
    investment: string;
    marketType: string;
    mode: string;
    leverage: string;
    direction: string;
    riskStrategy: string;
    riskParams: string;
    maxLoss: string;
    botTPSL: string;
    posTPSL: string;
    tradingMode: string;
    indicators: IndicatorConfig[];
    securityIndicator: string;
    metrics: BotMetrics;
}

export interface MockGlobalTrade {
    id: string;
    pair: string;
    side: 'BUY' | 'SELL';
    time: string;
    price: string;
    vol: string;
    user: string;
    botType: string;
}

// --- Seedable Random Generator ---
class SeededRandom {
    private seed: number

    constructor(seed: number) {
        this.seed = seed
    }

    next(): number {
        const x = Math.sin(this.seed++) * 10000
        return x - Math.floor(x)
    }

    // Generate between min (inclusive) and max (exclusive)
    between(min: number, max: number): number {
        return this.next() * (max - min) + min
    }

    // Generate integer between min (inclusive) and max (inclusive)
    intBetween(min: number, max: number): number {
        return Math.floor(this.between(min, max + 1))
    }

    // Pick random element from array
    pick<T>(array: T[]): T {
        return array[Math.floor(this.next() * array.length)]
    }
}

// --- Global Seed for Deterministic Randomness ---
const globalSeed = 123456789 // Fixed seed for consistency
const random = new SeededRandom(globalSeed)

// --- Pre-generate all random data ---

// User Data
export const MOCK_USERS: MockUser[] = Array.from({ length: 124 }).map((_, i) => {
    const userSeed = globalSeed + i * 1000
    const userRandom = new SeededRandom(userSeed)

    const firstNames = ['Alexander', 'Sarah', 'James', 'Elena', 'Michael', 'David', 'Sofia', 'Lucas']
    const lastNames = ['Mercer', 'Connor', 'Bond', 'Fisher', 'Stark', 'Wu', 'Silva', 'Mueller']
    const countries = ['Germany', 'United Kingdom', 'France', 'Switzerland', 'UAE', 'USA', 'Japan', 'Singapore']
    const plans = ['BASIC', 'ESSENTIAL', 'PRO'] as const
    const planFreqs = ['MONTHLY', 'ANNUAL'] as const
    const statuses = ['ACTIVE', 'ACTIVE', 'ACTIVE', 'SUSPENDED'] as const

    return {
        id: `U-${1000 + i}`,
        firstName: firstNames[i % 8],
        lastName: lastNames[i % 8],
        email: `user${1000 + i}@unitedalgos.com`,
        country: countries[i % 8],
        plan: plans[i % 3],
        planFreq: planFreqs[i % 2],
        botCount: i % 10 === 0 ? 350 : Math.floor(userRandom.between(0, 150)),
        birthday: '1990-05-15',
        joinedAt: `2024-0${(i % 9) + 1}-12`,
        balance: userRandom.between(0, 250000).toFixed(2),
        status: statuses[i % 4],
        avatar: `https://ui-avatars.com/api/?name=User+${i}&background=000&color=fff`,
        brokers: ['Binance', 'Bybit'],
        billingAddress: 'Friedrichstraße 12, 10117 Berlin, Germany',
        session: {
            city: 'Freiburg',
            region: 'Baden-Wurttemberg',
            country: 'DE',
            timezone: 'Europe/Berlin',
            ip: '2a02:8071:b785:eec0:e9ce:15c2:f962:78ba'
        },
        activityHistory: Array.from({ length: 42 }).map((_, j) => ({
            action: ['LOGIN_SUCCESS', 'BROKER_CONNECTED', '2FA_ENABLED', 'PASSWORD_CHANGED', 'AVATAR_UPDATED', 'ORDER_EXECUTED', 'API_KEY_CREATED', 'WITHDRAWAL_INITIATED', 'DEPOSIT_CONFIRMED'][j % 9],
            details: ['Bybit API', 'Authenticator App', 'User initiated', 'Profile settings', 'Limit Order #9921', 'Read-only Key', 'To: 0x82...19', 'From: Coinbase'][j % 8],
            time: j === 0 ? 'Today, 14:02' : j === 1 ? 'Yesterday, 09:15' : `Oct ${Math.max(1, 30-j)}, ${10+ (j%12)}:30`,
            ip: j % 3 === 0 ? '84.112.92.1' : null
        }))
    }
})

// Bot Data
export const MOCK_BOTS: MockBot[] = Array.from({ length: 15 }).map((_, i) => {
    const botSeed = globalSeed + i * 2000
    const botRandom = new SeededRandom(botSeed)

    return {
        id: `BOT-${800 + i}`,
        name: i % 2 === 0 ? `Grid Master V${i}` : `AI Sniper X${i}`,
        type: ['TECHNICAL', 'GRID', 'DCA', 'CUSTOM_AI'][i % 4],
        status: ['RUNNING', 'PAUSED', 'ERROR', 'STOPPED'][i % 4],
        symbol: i % 3 === 0 ? 'BTC/USDT' : 'ETH/USDT',
        strategy: i % 2 === 0 ? 'Neutral Hedge' : 'Momentum Trend',
        runtime: `${Math.floor(botRandom.between(0, 500))}h`,
        pnl: botRandom.between(-1000, 5000).toFixed(2),
        startedAt: '2024-10-15',
        exchange: ['Binance', 'Bybit', 'KuCoin'][i % 3],
        investment: botRandom.between(500, 5500).toFixed(0),
        marketType: i % 2 === 0 ? 'FUTURES' : 'SPOT',
        mode: i % 2 === 0 ? 'HEDGE' : 'SINGLE',
        leverage: i % 2 === 0 ? '20x' : '10x',
        direction: ['LONG', 'SHORT', 'NEUTRAL'][i % 3],
        riskStrategy: ['Martingale', 'Kelly Criterion', 'Fixed %', 'Reverse-Martingale'][i % 4],
        riskParams: i % 4 === 0 ? 'Multiplier: 1.5x' : 'Risk: 2% / Trade',
        maxLoss: '15%',
        botTPSL: 'TP: 25% | SL: -10%',
        posTPSL: 'TP: 1.5% | SL: -2.0%',
        tradingMode: i % 3 === 0 ? 'PAPER' : 'LIVE',
        indicators: [
            { name: 'RSI', tf: '15m', params: 'Length: 14, Overbought: 70' },
            { name: 'MACD', tf: '1h', params: 'Fast: 12, Slow: 26, Sig: 9' }
        ],
        securityIndicator: 'ATR Volatility Stop (14, 2.0)',
        metrics: {
            roi: botRandom.between(-10, 50).toFixed(2),
            drawdown: botRandom.between(0, 20).toFixed(2),
            winRate: botRandom.between(40, 70).toFixed(1),
            sharpe: botRandom.between(0, 3).toFixed(2),
            profitFactor: botRandom.between(0.5, 2.5).toFixed(2),
            totalTrades: Math.floor(botRandom.between(50, 250))
        }
    }
})

// Trade Data (Global Trade Stream)
export const MOCK_GLOBAL_TRADES: MockGlobalTrade[] = Array.from({ length: 100 }).map((_, i) => {
    const tradeSeed = globalSeed + i * 3000
    const tradeRandom = new SeededRandom(tradeSeed)

    const pairs = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'ADA/USDT', 'DOT/USDT']
    const botTypes = ['TECHNICAL', 'GRID', 'DCA', 'CUSTOM_AI'] as const

    const hours = Math.floor(i / 60)
    const minutes = i % 60

    return {
        id: `TRD-${10000 + i}`,
        pair: pairs[i % pairs.length],
        side: tradeRandom.next() > 0.5 ? 'BUY' : 'SELL',
        time: `${String(14 + hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}`,
        price: tradeRandom.between(1000, 61000).toFixed(2),
        vol: tradeRandom.between(0, 2).toFixed(4),
        user: `User-${1000 + (i % 20)}`,
        botType: botTypes[i % botTypes.length],
    }
})

// Chart Data (Pre-generated deterministic charts)
export const MOCK_PNL_DATA = (() => {
    const chartSeed = globalSeed + 4000
    const chartRandom = new SeededRandom(chartSeed)

    return Array.from({ length: 200 }).map((_, i) => ({
        d: i,
        v: Math.sin(i * 0.1) * 200 + chartRandom.between(0, 500) + 1000
    }))
})()

export const MOCK_EQUITY_DATA = (() => {
    const chartSeed = globalSeed + 5000
    const chartRandom = new SeededRandom(chartSeed)
    let current = 25000

    return Array.from({ length: 200 }).map((_, i) => {
        current = current + (chartRandom.between(-0.4, 0.4)) * 500
        return { d: i, v: current }
    })
})()

// System Performance Chart Data
export const generateSystemPerformanceData = (points: number): SystemMetric[] => {
    const chartSeed = globalSeed + 6000
    const chartRandom = new SeededRandom(chartSeed)

    return Array.from({ length: points }).map((_, i) => {
        const label = points === 24
            ? `${String(i).padStart(2, '0')}:00`
            : `D-${points - i}`

        const trend = i * (points === 24 ? 100 : 500)
        const noise = chartRandom.between(0, 500)

        return {
            name: label,
            mrr: 120000 + trend + noise,
            users: 3200 + (i * 5) + chartRandom.between(0, 10),
            newUsers: Math.floor(chartRandom.between(0, 50)) + 10,
            basic: 400 + i * 2,
            essential: 250 + i,
            pro: 100 + i * 0.5,
            trades: Math.floor(chartRandom.between(0, 5000)) + 1000,
            technical: 150 + i + chartRandom.between(0, 20),
            grid: 80 + i * 0.5 + chartRandom.between(0, 10),
            dca: 60 + i * 0.2 + chartRandom.between(0, 5),
            ai: 20 + i * 0.8 + chartRandom.between(0, 2)
        }
    })
}

// Other data exports
export {
    MOCK_INVOICES,
    MOCK_ACTION_HISTORY,
    MOCK_LOGS,
    HISTORICAL_LOG_MSGS,
    MOCK_TRADES
} from './data'
