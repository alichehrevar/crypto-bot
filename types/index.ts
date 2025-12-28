// types/index.ts
export interface Invoice {
    id: string
    date: string
    amount: string
    status: 'PAID' | 'FAILED' | 'PENDING'
}

export interface AdminAction {
    id: string
    action: string
    admin: string
    details: string
    time: string
    type: string
}

// Update the existing types to be more specific if needed
export interface User {
    id: string
    firstName: string
    lastName: string
    email: string
    country: string
    plan: 'BASIC' | 'ESSENTIAL' | 'PRO'
    planFreq: 'MONTHLY' | 'ANNUAL'
    botCount: number
    birthday: string
    joinedAt: string
    balance: string
    status: 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'INACTIVE'
    avatar: string
    brokers: string[]
    billingAddress: string
    session: {
        city: string
        region: string
        country: string
        timezone: string
        ip: string
    }
    activityHistory: ActivityHistory[]
}

export interface ActivityHistory {
    action: string
    details: string
    time: string
    ip: string | null
}

export interface Bot {
    id: string
    name: string
    type: 'TECHNICAL' | 'GRID' | 'DCA' | 'CUSTOM_AI'
    status: 'RUNNING' | 'PAUSED' | 'ERROR' | 'STOPPED'
    symbol: string
    strategy: string
    runtime: string
    pnl: string
    startedAt: string
    exchange: string
    investment: string
    marketType: 'FUTURES' | 'SPOT'
    mode: 'HEDGE' | 'SINGLE'
    leverage: string
    direction: 'LONG' | 'SHORT' | 'NEUTRAL'
    riskStrategy: string
    riskParams: string
    maxLoss: string
    botTPSL: string
    posTPSL: string
    tradingMode: 'PAPER' | 'LIVE'
    indicators: Indicator[]
    securityIndicator: string
    metrics: BotMetrics
}

export interface Indicator {
    name: string
    tf: string
    params: string
}

export interface BotMetrics {
    roi: string
    drawdown: string
    winRate: string
    sharpe: string
    profitFactor: string
    totalTrades: number
}

export interface Trade {
    id: string
    time: string
    side: 'BUY' | 'SELL'
    price: number
    qty: number
    status: 'FILLED' | 'REJECTED' | 'PENDING' | 'CANCELLED'
    reason: string | null
    pnl: string | null
}

export interface LogEntry {
    level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'
    msg: string
    ts: string
}
