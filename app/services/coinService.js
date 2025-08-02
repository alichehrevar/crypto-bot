// app/services/coinService.js
const axios = require('axios');
const BASE  = 'https://api.coinpaprika.com/v1';
const IMAGE_CDN = 'https://static.coinpaprika.com/coin';

async function getCoinSummary(coinId) {
    // 1) fetch ticker and today’s OHLCV in parallel
    const [ tickRes, todayRes ] = await Promise.all([
        axios.get(`${BASE}/tickers/${coinId}`),
        axios.get(`${BASE}/coins/${coinId}/ohlcv/today`)
    ]);

    // 2) Check HTTP status codes
    if (tickRes.status !== 200)  throw new Error('Failed to fetch ticker');
    if (todayRes.status !== 200) throw new Error('Failed to fetch today OHLCV');

    // 3) Pull data out of axios responses
    const ticker    = tickRes.data;
    const todayBars = todayRes.data;
    const today     = Array.isArray(todayBars) ? todayBars[0] : {};

    // 4) Return your summary
    return {
        id:                 ticker.id,
        name:               ticker.name,
        symbol:             ticker.symbol,
        price:              ticker.quotes.USD.price,
        percent_change_24h: ticker.quotes.USD.percent_change_24h,
        volume_24h:         ticker.quotes.USD.volume_24h,
        market_cap:         ticker.quotes.USD.market_cap,
        last_updated:       ticker.last_updated,

        open:   today.open,
        high:   today.high,
        low:    today.low,
        close:  today.close,

        // 52-week data not available on free plan
        week52_high: null,
        week52_low:  null,

        imageUrl: `${IMAGE_CDN}/${ticker.id}/logo.png`,
    };
}

module.exports = { getCoinSummary };
