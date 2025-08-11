// ───────────────────────────────────────────────────────────────────────────────
// lib/market/mockData.ts (same logic as original, condensed)
// ───────────────────────────────────────────────────────────────────────────────
const rnd = (min: number, max: number) => Math.random() * (max - min) + min;

const generateSummaryData = () => ({
    aiAnalysis: 'The market is showing signs of short-term consolidation after a strong uptrend…',
    sentimentScore: 72,
    anomalyFeed: [
        { id: 1, type: 'Volume', asset: 'RNDR', detail: 'Volume 4.2x above 24h avg.', time: '2m ago', severity: 'High' },
        { id: 2, type: 'Funding', asset: 'ETH', detail: 'Funding flipped negative.', time: '15m ago', severity: 'Medium' },
        { id: 3, type: 'On-Chain', asset: 'BTC', detail: '10k BTC to exchange.', time: '45m ago', severity: 'High' },
        { id: 4, type: 'OI', asset: 'SOL', detail: 'OI +25% in 1h.', time: '1h ago', severity: 'Medium' },
    ],
});

const generateMoversData = () => {
    const assets = ['BTC','ETH','SOL','ADA','DOT','XRP','LINK','RNDR','FET','AGIX','GALA','MANA','SAND','AVAX','NEAR','ATOM','ICP','FTM'];
    const data = assets.map(a => {
        const change = rnd(-15, 15);
        const volume = rnd(50_000_000, 2_000_000_000);
        const avgVolume = rnd(100_000_000, 1_000_000_000);
        const rVol = volume / avgVolume;
        let val = 100;
        const sparkline = Array.from({ length: 24 }, (_, i) => { val += rnd(-2, 2) + (change/25);

 return { x: i, y: val }; });

        return { asset: a, change, volume, rVol, sparkline };
    });

    const gainers = data.filter(d => d.change >= 0).sort((a,b)=>b.change-a.change).slice(0,10);
    const losers  = data.filter(d => d.change < 0).sort((a,b)=>a.change-b.change).slice(0,10);
    const volatilityScatterNivo = [{ id: 'Assets', data: data.map(it => ({ x: it.change, y: it.volume, asset: it.asset, rVol: it.rVol })) }];

    return { gainers, losers, volatilityScatter: data, volatilityScatterNivo };
};

const generateSectorsData = () => {
    const sectors = ['DeFi 2.0','Layer 1 protocols','Layer 2 scaling','AI & big data','Gaming & metaverse','Infrastructure','Real world assets (RWA)'];
    const performance = sectors.map(s => ({ sector: s, performance1D: rnd(-4, 8) })).sort((a,b)=>b.performance1D-a.performance1D);
    const today = new Date();
    const timeSeries = sectors.map(s => {
        let trend = s.includes('AI') ? 0.015 : s.includes('DeFi') ? -0.008 : (s.includes('Layer 1') || s.includes('RWA')) ? 0.005 : rnd(-0.003, 0.003);
        const data = Array.from({ length: 30 }, (_, i) => {
            const d = new Date(today);

 d.setDate(today.getDate() - (29 - i));
            const day = d.toISOString().split('T')[0];
            const value = (100 * (1 + i * trend)) * rnd(0.98, 1.02);

            return { x: day, y: value };
        });

        return { id: s, data };
    });

    return { performance, timeSeries };
};

const generateLiquidityFlowsData = () => {
    const currentPrice = 69000; const bid: any[] = []; const ask: any[] = []; let cb=0, ca=0;

    for (let i=0;i<50;i++){ const bp=currentPrice-(i*50); const bs=rnd(5,50);

 cb+=bs; bid.unshift({ x: bp, y: cb }); const ap=currentPrice+((i+1)*50); const as=rnd(5,50);

 ca+=as; ask.push({ x: ap, y: ca }); }
    const orderBook = { currentPrice, nivoData: [ { id:'Bids', data: bid, color:'#4CAF50' }, { id:'Asks', data: ask, color:'#F44336' } ] };
    const netFlows = { stablecoinNetFlow24h: rnd(-500, 500), exchangeNetFlow24h: rnd(-200, 200), history: Array.from({ length:7 }, (_,i)=>({ day:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][(i+1)%7], inflow:rnd(100,800), outflow:rnd(100,800) * -1 })) };
    const slippageMetrics = [ { asset:'BTC (High Liq.)', slippage1k:0.01, slippage100k:0.15 }, { asset:'ETH (High Liq.)', slippage1k:0.02, slippage100k:0.25 }, { asset:'SOL (Medium Liq.)', slippage1k:0.10, slippage100k:1.50 }, { asset:'MEME (Low Liq.)', slippage1k:0.80, slippage100k:12.50 }, ];

    return { orderBook, netFlows, slippageMetrics };
};

const generateSentimentData = () => ({
    trendingTopics: [
        { text:'AI Hype Cycle', sentiment:'Positive', linkedAssets:['RNDR','FET'], mentionChange:rnd(-20,50), zScore:rnd(-1.5,3.5), sparkline:Array.from({length:30},(_,i)=>({x:i,y:Math.max(0, rnd(500,2000)+rnd(-100,100))})) },
        { text:'ETF Inflows', sentiment:'Positive', linkedAssets:['BTC','ETH'], mentionChange:rnd(-20,50), zScore:rnd(-1.5,3.5), sparkline:Array.from({length:30},(_,i)=>({x:i,y:Math.max(0, rnd(500,2000)+rnd(-100,100))})) },
        { text:'Inflation Data', sentiment:'Negative', linkedAssets:['SPY','TLT'], mentionChange:rnd(-20,50), zScore:rnd(-1.5,3.5), sparkline:Array.from({length:30},(_,i)=>({x:i,y:Math.max(0, rnd(500,2000)+rnd(-100,100))})) },
    ],
    events: [
        { id:1, date:'2025-08-08', time:'14:00 UTC', event:'US Non-Farm Payrolls (July)', impact:'High', forecast:'180k', actual:'205k', isPast:true },
        { id:2, date:'2025-08-12', time:'12:30 UTC', event:'US CPI Data Release (July)', impact:'High', forecast:'3.1%', actual:'TBD' },
        { id:3, date:'2025-08-15', time:'16:00 UTC', event:'Ethereum "Pectra" Upgrade Spec', impact:'Medium', forecast:'N/A', actual:'TBD' },
    ]
});

const generateNewListingsData = () => ({
    upcoming: [ { id:1, date:'2025-08-15 12:00 UTC', asset:'ZKSync (ZK)', type:'TGE', exchange:'Multiple' }, { id:2, date:'2025-08-22 14:00 UTC', asset:'LayerZero (ZRO)', type:'Listing', exchange:'Binance, Coinbase' } ],
    recent: [ { asset:'Wormhole (W)', launchDate:'2025-07-10', launchPrice:1.25, currentPrice:0.95, velocity:'Medium' }, { asset:'Ethena (ENA)', launchDate:'2025-07-15', launchPrice:0.60, currentPrice:1.80, velocity:'Very High' } ]
});

export const initializeMarketData = () => ({
    summary: generateSummaryData(),
    movers: generateMoversData(),
    sectors: generateSectorsData(),
    liquidity: generateLiquidityFlowsData(),
    sentiment: generateSentimentData(),
    listings: generateNewListingsData(),
});
