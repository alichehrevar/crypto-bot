// lib/data.ts
import { User, Bot, Trade, LogEntry, Invoice, AdminAction } from '@/types'

export const MOCK_USERS: User[] = Array.from({ length: 124 }).map((_, i) => ({
    id: `U-${1000 + i}`,
    firstName: ['Alexander', 'Sarah', 'James', 'Elena', 'Michael', 'David', 'Sofia', 'Lucas'][i % 8],
    lastName: ['Mercer', 'Connor', 'Bond', 'Fisher', 'Stark', 'Wu', 'Silva', 'Mueller'][i % 8],
    email: `user${1000 + i}@unitedalgos.com`,
    country: ['Germany', 'United Kingdom', 'France', 'Switzerland', 'UAE', 'USA', 'Japan', 'Singapore'][i % 8],
    plan: ['BASIC', 'ESSENTIAL', 'PRO'][i % 3] as 'BASIC' | 'ESSENTIAL' | 'PRO',
    planFreq: ['MONTHLY', 'ANNUAL'][i % 2] as 'MONTHLY' | 'ANNUAL',
    botCount: i % 10 === 0 ? 350 : Math.floor(Math.random() * 150),
    birthday: '1990-05-15',
    joinedAt: `2024-0${(i % 9) + 1}-12`,
    balance: (Math.random() * 250000).toFixed(2),
    status: ['ACTIVE', 'ACTIVE', 'ACTIVE', 'SUSPENDED'][i % 4] as 'ACTIVE' | 'SUSPENDED',
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
}))

export const MOCK_BOTS: Bot[] = Array.from({ length: 15 }).map((_, i) => ({
    id: `BOT-${800 + i}`,
    name: i % 2 === 0 ? `Grid Master V${i}` : `AI Sniper X${i}`,
    type: ['TECHNICAL', 'GRID', 'DCA', 'CUSTOM_AI'][i % 4] as 'TECHNICAL' | 'GRID' | 'DCA' | 'CUSTOM_AI',
    status: ['RUNNING', 'PAUSED', 'ERROR', 'STOPPED'][i % 4] as 'RUNNING' | 'PAUSED' | 'ERROR' | 'STOPPED',
    symbol: i % 3 === 0 ? 'BTC/USDT' : 'ETH/USDT',
    strategy: i % 2 === 0 ? 'Neutral Hedge' : 'Momentum Trend',
    runtime: `${Math.floor(Math.random() * 500)}h`,
    pnl: (Math.random() * 5000 - 1000).toFixed(2),
    startedAt: '2024-10-15',
    exchange: ['Binance', 'Bybit', 'KuCoin'][i % 3],
    investment: (Math.random() * 5000 + 500).toFixed(0),
    marketType: i % 2 === 0 ? 'FUTURES' : 'SPOT',
    mode: i % 2 === 0 ? 'HEDGE' : 'SINGLE',
    leverage: i % 2 === 0 ? '20x' : '10x',
    direction: ['LONG', 'SHORT', 'NEUTRAL'][i % 3] as 'LONG' | 'SHORT' | 'NEUTRAL',
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
        roi: (Math.random() * 50 - 10).toFixed(2),
        drawdown: (Math.random() * 20).toFixed(2),
        winRate: (Math.random() * 30 + 40).toFixed(1),
        sharpe: (Math.random() * 3).toFixed(2),
        profitFactor: (Math.random() * 2 + 0.5).toFixed(2),
        totalTrades: Math.floor(Math.random() * 200 + 50)
    }
}))

export const MOCK_TRADES: Trade[] = Array.from({ length: 60 }).map((_, i) => ({
    id: `ORD-${9000 + i}`,
    time: `2024-10-24 14:${10 + i}:00`,
    side: i % 2 === 0 ? 'BUY' : 'SELL',
    price: 64200 + (i * 25),
    qty: 0.15,
    status: ['FILLED', 'FILLED', 'FILLED', 'REJECTED', 'PENDING'][i % 5] as 'FILLED' | 'REJECTED' | 'PENDING',
    reason: i % 5 === 3 ? 'Margin Limit Exceeded' : null,
    pnl: i % 2 === 0 ? null : `+${(i * 1.5).toFixed(2)}`
}))

const generateLogTime = (minutesAgo: number) => {
    const d = new Date()
    d.setMinutes(d.getMinutes() - minutesAgo)
    return d.toISOString()
}

export const MOCK_LOGS: LogEntry[] = [
    { level: 'INFO', msg: 'Market Data Stream: Connected (14ms)', ts: generateLogTime(1) },
    { level: 'INFO', msg: 'Strategy Engine: Initialized logic layer', ts: generateLogTime(2) },
    { level: 'WARN', msg: 'Risk Manager: Exposure approaching limit (85%)', ts: generateLogTime(5) },
    { level: 'INFO', msg: 'Execution: Order #ORD-9005 sent to Binance', ts: generateLogTime(10) },
    { level: 'ERROR', msg: 'API Gateway: Connection reset by peer', ts: generateLogTime(15) },
]

export const HISTORICAL_LOG_MSGS = [
    "Calculating pivots...",
    "Volume spike analysis...",
    "Order book depth check...",
    "Volatility index update...",
    "Heartbeat: System healthy",
    "RSI threshold verification...",
    "MACD crossover scan...",
    "Latency check: 12ms",
    "Syncing order status...",
    "Memory usage optimization..."
]

export const MOCK_INVOICES: Invoice[] = [
    { id: 'INV-2024-10-01', date: 'Oct 01, 2024', amount: '$49.00', status: 'PAID' },
    { id: 'INV-2024-09-01', date: 'Sep 01, 2024', amount: '$49.00', status: 'PAID' },
    { id: 'INV-2024-08-01', date: 'Aug 01, 2024', amount: '$49.00', status: 'PAID' },
    { id: 'INV-2024-07-01', date: 'Jul 01, 2024', amount: '$49.00', status: 'PAID' },
    { id: 'INV-2024-06-01', date: 'Jun 01, 2024', amount: '$49.00', status: 'PAID' },
    { id: 'INV-2024-05-12', date: 'May 12, 2024', amount: '$29.00', status: 'PAID' },
    { id: 'INV-2024-04-01', date: 'Apr 01, 2024', amount: '$49.00', status: 'PAID' },
    { id: 'INV-2024-03-01', date: 'Mar 01, 2024', amount: '$49.00', status: 'PAID' },
    { id: 'INV-2024-02-01', date: 'Feb 01, 2024', amount: '$49.00', status: 'PAID' },
    { id: 'INV-2024-01-01', date: 'Jan 01, 2024', amount: '$49.00', status: 'PAID' },
    { id: 'INV-2023-12-01', date: 'Dec 01, 2023', amount: '$49.00', status: 'PAID' },
    { id: 'INV-2023-11-01', date: 'Nov 01, 2023', amount: '$49.00', status: 'PAID' },
    { id: 'INV-2023-10-01', date: 'Oct 01, 2023', amount: '$49.00', status: 'PAID' },
    { id: 'INV-2023-09-15', date: 'Sep 15, 2023', amount: '$29.00', status: 'PAID' },
    { id: 'INV-2023-08-01', date: 'Aug 01, 2023', amount: '$29.00', status: 'PAID' },
    { id: 'INV-2023-07-01', date: 'Jul 01, 2023', amount: '$29.00', status: 'FAILED' },
    { id: 'INV-2023-06-01', date: 'Jun 01, 2023', amount: '$29.00', status: 'PAID' },
    { id: 'INV-2023-05-01', date: 'May 01, 2023', amount: '$29.00', status: 'PAID' },
    { id: 'INV-2023-04-01', date: 'Apr 01, 2023', amount: '$29.00', status: 'PAID' },
    { id: 'INV-2023-03-01', date: 'Mar 01, 2023', amount: '$29.00', status: 'PAID' },
]

export const MOCK_ACTION_HISTORY: AdminAction[] = [
    { id: 'ACT-9921', action: 'MANUAL_UPGRADE', admin: 'Kaveh', details: 'Upgraded from Basic to Pro', time: '2024-10-24 10:00', type: 'subscription' },
    { id: 'ACT-8821', action: 'FEE_ADJUSTMENT', admin: 'System', details: 'Applied 10% discount coupon', time: '2024-09-01 09:00', type: 'billing' },
    { id: 'ACT-7712', action: 'FLAGGED_RISK', admin: 'Auto_Mod', details: 'Flagged for unusual login IP', time: '2024-08-15 14:20', type: 'security' },
    { id: 'ACT-6623', action: 'NOTE_ADDED', admin: 'Support_Team', details: 'User requested extended trial', time: '2024-08-10 11:00', type: 'note' },
    { id: 'ACT-5514', action: 'PASSWORD_RESET', admin: 'Support_Team', details: 'Password reset requested by user', time: '2024-07-22 16:30', type: 'security' },
    { id: 'ACT-4415', action: 'API_KEY_REVOKED', admin: 'System_Auto', details: 'Revoked expired API key', time: '2024-07-15 03:45', type: 'security' },
    { id: 'ACT-3316', action: 'BOT_DEPLOYMENT', admin: 'User_Initiated', details: 'Deployed "Grid Master V2" bot', time: '2024-06-28 09:15', type: 'deployment' },
    { id: 'ACT-2217', action: 'SUBSCRIPTION_RENEWAL', admin: 'System', details: 'Monthly subscription renewed', time: '2024-06-01 00:00', type: 'billing' },
    { id: 'ACT-1118', action: 'TWO_FACTOR_ENABLED', admin: 'User_Initiated', details: 'Enabled Google Authenticator', time: '2024-05-18 14:22', type: 'security' },
    { id: 'ACT-0019', action: 'WITHDRAWAL_APPROVED', admin: 'Kaveh', details: 'Approved $5000 withdrawal request', time: '2024-05-05 11:30', type: 'transaction' },
    { id: 'ACT-8890', action: 'ACCOUNT_VERIFIED', admin: 'Support_Team', details: 'Completed KYC Level 2 verification', time: '2024-04-20 10:15', type: 'verification' },
    { id: 'ACT-7781', action: 'DEPOSIT_RECEIVED', admin: 'System', details: '$10,000 deposit from Coinbase', time: '2024-04-12 08:45', type: 'transaction' },
    { id: 'ACT-6672', action: 'TRADING_LIMIT_INCREASED', admin: 'Risk_Team', details: 'Increased daily limit to $50,000', time: '2024-03-30 13:20', type: 'risk' },
    { id: 'ACT-5563', action: 'EMAIL_CHANGED', admin: 'User_Initiated', details: 'Updated email address', time: '2024-03-15 17:05', type: 'profile' },
    { id: 'ACT-4454', action: 'IP_WHITELIST_ADDED', admin: 'User_Initiated', details: 'Added new IP to whitelist', time: '2024-02-28 21:10', type: 'security' },
]
