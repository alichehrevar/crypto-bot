import {Broker} from "@/types/profile/settings/BrokerTypes";

export const BROKERS: Broker[] = [
    {
        id: 'binance',
        name: 'Binance',
        logo: '/images/logos/market/binance-logo.png',
        accentColor: '#F0B90B',
        instructions: [
            { content: [
                    { type: 'text', content: 'Login to your Binance ' },
                    { type: 'link', content: 'account', url: 'https://accounts.binance.com/en/login' }
                ] },
            { content: [{ type: 'text', content: "Go to " }, { type: 'link', content: "API Management", url: 'https://www.binance.com/en/my/settings/api-management' }] },
            { content: "Click 'Create API' (System generated)" },
            { content: "Enable 'Spot & Margin Trading'", hint: "Important: Disable 'Withdrawals'" },
            { content: "Copy the API Key and Secret Key" }
        ]
    },
    {
        id: 'okx',
        name: 'OKX',
        logo: '/images/logos/market/okx-logo.svg',
        accentColor: '#FFFFFF',
        instructions: [
            { content: [
                    { type: 'text', content: 'Login to your OKX ' },
                    { type: 'link', content: 'account', url: 'https://www.okx.com/login' }
                ] },
            { content: [{ type: 'text', content: "Go to " }, { type: 'link', content: "API", url: 'https://www.okx.com/account/my-api' }, { type: 'text', content: ", then 'Create V5 API key'" }] },
            { content: "Set a strong passphrase" },
            { content: "Set permissions to 'Read' & 'Trade'", hint: "Important: Do not enable withdrawals" },
            { content: "Copy Key, Secret, & Passphrase" }
        ]
    },
    {
        id: 'bingx',
        name: 'BingX',
        logo: '/images/logos/market/bingx-logo.png',
        accentColor: '#4A90E2', // Corrected hex color
        instructions: [
            { content: [
                    { type: 'text', content: 'Login to your BingX ' },
                    { type: 'link', content: 'account', url: 'https://bingx.com/en-us/login/' }
                ] },
            { content: [{ type: 'text', content: "Go to " }, { type: 'link', content: "API Management", url: 'https://bingx.com/en-us/account/api/' }] },
            { content: "Click 'Create API' & set permissions" },
            { content: "Complete 2FA verification" },
            { content: "Copy the API Key and Secret Key" }
        ]
    },
    {
        id: 'bybit',
        name: 'Bybit',
        logo: '/images/logos/market/bybit-logo.png',
        accentColor: '#F7A600',
        instructions: [
            { content: [
                    { type: 'text', content: 'Login to your Bybit ' },
                    { type: 'link', content: 'account', url: 'https://www.bybit.com/en/login' },
                ] },
            { content: [
                    { type: 'text', content: 'Then go to ' },
                    { type: 'link', content: 'API', url: 'https://www.bybit.com/app/user/api-management' }
                ]},
            { content: "Click 'Create New Key'  'System-Generated'" },
            { content: "Set permissions to 'Read-Write'", hint: "Important: Ensure 'Withdrawals' are disabled" },
            { content: "Copy the API Key and Secret" }
        ]
    },
    {
        id: 'coinbase',
        name: 'Coinbase',
        logo: '/images/logos/market/coinbase-logo.png',
        accentColor: '#0052FF',
        instructions: [
            { content: [
                    { type: 'text', content: 'Login to your Coinbase ' },
                    { type: 'link', content: 'account', url: 'https://login.coinbase.com/' }
                ] },
            { content: [{ type: 'text', content: "Go to Settings  " }, { type: 'link', content: "API", url: 'https://www.coinbase.com/settings/api' }] },
            { content: "Click 'New API Key'" },
            { content: "Enable trading permissions", hint: "e.g., 'wallet:trades:create'" },
            { content: "Copy the API Key and Secret", hint: "Important: Ensure withdrawals are disabled" }
        ]
    },
    {
        id: 'kraken',
        name: 'Kraken',
        logo: '/images/logos/market/kraken-logo.png',
        accentColor: '#5841D8',
        instructions: [
            { content: [
                    { type: 'text', content: 'Login to your Kraken ' },
                    { type: 'link', content: 'account', url: 'https://www.kraken.com/sign-in' }
                ] },
            { content: [{ type: 'text', content: "Go to Security  " }, { type: 'link', content: "API", url: 'https://www.kraken.com/u/security/api' }] },
            { content: "Click 'Add key'" },
            { content: "Enable 'Query Funds' permission" },
            { content: "Enable 'Create & Modify Orders'", hint: "Important: Do not enable 'Withdraw Funds'" },
            { content: "Copy the API & Private Key" }
        ]
    },
];
