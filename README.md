# United Algos Admin

Operator console for the United Algos crypto-bot platform. It is the control plane in front of the trading API: authenticated access, user and bot operations, strategy defaults, risk controls, and an audit vault.

This is not an npm library and it is not a trading engine. Orders, positions, and strategy execution live in the backend the console calls. The UI is a Next.js 16 / TypeScript app deployed as a private admin service.

## What it covers

| Area | Route | Role |
| --- | --- | --- |
| Command Center | `/` | Platform telemetry: AUM, revenue, active bots, volume, performance chart, global trade stream |
| User Hub | `/users`, `/users/[id]` | Operator view of accounts, billing, bots, and actions |
| Bots | `/bots`, `/bot/[botId]` | Bot fleet and per-bot detail, including logs |
| Strategy Foundry | `/strategy-foundry` | Global strategy defaults saved to the admin API |
| Risk Control | `/risk-control` | Exposure, circuit breakers, lockdown, flagged-account investigation |
| Audit Vault | `/audit-vault` | Reviewable history of operator and system actions |
| Login | `/login` | Credentials login against the backend auth API |

Supported venue marks in the UI: Binance, Bybit, OKX, BingX, Coinbase, Kraken.

## Strategy Foundry

Global defaults are loaded from `GET /admin/indicator-settings` and saved with `PUT` to the same path.

- **Technical:** RSI, MACD, Bollinger Bands, Stochastic RSI, MA crossover, SMA, ATR, Smoothed Heikin Ashi, Donchian
- **Custom AI:** n8n webhook URL and connection state
- **Smart:** workflow start, optimized-strategy toggle, timeframes `1m` `5m` `15m` `1h` `4h` `1d`
- **Grid:** spacing, max active orders, minimum investment, allowed pairs, leverage limit
- **DCA:** step scale, volume scale, plus the shared order and pair limits

## Stack

- Next.js 16 (App Router) and React 19
- TypeScript, Tailwind CSS 4
- Auth.js / NextAuth v5, credentials provider, JWT session
- Chart.js and Recharts
- PM2 cluster on port `3006` (`ecosystem.config.js`)

Server actions in `actions/` talk to `API_URL`. Auth posts credentials to `/auth/login` and stores the backend access token on the session.

## Requirements

- Node.js 20+
- A running United Algos admin API

## Setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Dev server listens on [http://localhost:3006](http://localhost:3006).

### Environment

| Variable | Purpose |
| --- | --- |
| `NAME` | Display name override |
| `API_URL` | Backend base URL used by server actions |
| `CDN_URL` | Asset / CDN base URL |
| `AUTH_SECRET` | Auth.js session secret |
| `JWT_SECRET` | JWT signing secret shared with the auth flow |

Do not commit `.env.local`. `AUTH_SECRET` and `JWT_SECRET` must be long random values in every deployed environment.

## Scripts

```bash
npm run dev    # next dev -p 3006
npm run build
npm run start  # next start -p 3006
npm run lint
```

## Production

```bash
npm ci
npm run build
pm2 start ecosystem.config.js
```

PM2 runs `next start` in cluster mode, one instance per CPU, on port `3006`. Put it behind TLS and restrict the host to operator networks. This app holds session tokens that can act on user bots.

## Project layout

```text
app/
  (dashboard)/          command center, users, bots, risk, strategy, audit
  api/auth/             Auth.js route
  login/
actions/                get / post / put / delete against API_URL
components/             dashboard, users, strategy, risk, audit, charts
config/site.ts          product name and metadata
lib/                    auth, chart config, API helpers
types/                  auth, users, bot and strategy contracts
ecosystem.config.js     PM2 process file
```

## Status

The console is wired to the admin API for login and strategy-indicator settings. Command Center figures and parts of Risk Control (exposure, flagged accounts, kill switches) are still local fixtures and are not yet backed by live endpoints. Treat those screens as operator UI, not as a source of production risk numbers, until the API contracts land.

## License

No license file is published yet. Until one is added, all rights are reserved and the repository is not reusable by third parties.

## Security

- Operator-only. Do not expose port `3006` to the public internet.
- Rotate `AUTH_SECRET` and `JWT_SECRET` if a session secret leaks.
- Kill-switch and lockdown actions sever trading connectivity. Confirm the backend honors them before relying on the UI in an incident.
