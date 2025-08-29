// This file exports the shared data structure and the default demo data.

export type AssetNode = {
    name: string;
    value: number;
    color?: string;
    children?: AssetNode[];
    // runtime fields added during processing:
    parent?: AssetNode | null;
    depth?: number;
};

export const demoData: AssetNode = {
    name: 'Assets',
    value: 1085000,
    children: [
        {
            name: 'Binance',
            value: 255000,
            color: '#30B5D3',
            children: [
                { name: 'Spot', value: 90000, children: [{ name: 'BTC', value: 55000 }, { name: 'ETH', value: 35000 }] },
                { name: 'Future', value: 105000, children: [{ name: 'SOL-PERP', value: 60000 }, { name: 'ADA-PERP', value: 45000 }] },
                { name: 'Fund', value: 60000, children: [{ name: 'Launchpad', value: 40000 }, { name: 'Savings', value: 20000 }] },
            ],
        },
        {
            name: 'Kraken',
            value: 210000,
            color: '#87D30D',
            children: [
                { name: 'Spot', value: 80000, children: [{ name: 'XRP', value: 45000 }, { name: 'DOT', value: 35000 }] },
                { name: 'Future', value: 70000, children: [{ name: 'BTC-PERP', value: 50000 }, { name: 'LINK-PERP', value: 20000 }] },
                { name: 'Fund', value: 60000, children: [{ name: 'Staking', value: 40000 }, { name: 'Parachain', value: 20000 }] },
            ],
        },
        {
            name: 'Coinbase',
            value: 180000,
            color: '#E0AC00',
            children: [
                { name: 'Spot', value: 100000, children: [{ name: 'ETH', value: 60000 }, { name: 'USDC', value: 40000 }] },
                { name: 'Future', value: 50000, children: [{ name: 'ETH-PERP', value: 30000 }, { name: 'AVAX-PERP', value: 20000 }] },
                { name: 'Fund', value: 30000, children: [{ name: 'Vault', value: 20000 }, { name: 'Earn', value: 10000 }] },
            ],
        },
        {
            name: 'Bybit',
            value: 240000,
            color: '#00E0D5',
            children: [
                { name: 'Spot', value: 85000, children: [{ name: 'USDT', value: 50000 }, { name: 'BTC', value: 35000 }] },
                { name: 'Future', value: 110000, children: [{ name: 'BTC-PERP', value: 70000 }, { name: 'ETH-PERP', value: 40000 }] },
                { name: 'Fund', value: 45000, children: [{ name: 'ByStarter', value: 25000 }, { name: 'Pool', value: 20000 }] },
            ],
        },
        {
            name: 'OKX',
            value: 200000,
            color: '#DDE000',
            children: [
                { name: 'Spot', value: 70000, children: [{ name: 'OKB', value: 40000 }, { name: 'USDT', value: 30000 }] },
                { name: 'Future', value: 90000, children: [{ name: 'LTC-PERP', value: 50000 }, { name: 'DOGE-PERP', value: 40000 }] },
                { name: 'Fund', value: 40000, children: [{ name: 'Jumpstart', value: 25000 }, { name: 'Fixed Income', value: 15000 }] },
            ],
        },
    ],
};
