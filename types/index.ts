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

export type SubscriptionPlan = 'BASIC' | 'ESSENTIAL' | 'PRO'

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
