// app/news-data.ts

export interface Article {
    id: number;
    title: string;
    source: string;
    time: string;
    imageText: string;
    imageColor: string;
    content: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    tags: string[];
    takeaway: string;
}

export interface Comment {
    author: string;
    avatarText: string;
    text: string;
}

const longArticleContent = `<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent commodo cursus magna, vel scelerisque nisl consectetur et. Donec sed odio dui. Nullam id dolor id nibh ultricies vehicula ut id elit. Curabitur blandit tempus porttitor.</p><p>Integer posuere erat a ante venenatis dapibus posuere velit aliquet. Vestibulum id ligula porta felis euismod semper. Donec ullamcorper nulla non metus auctor fringilla. Aenean eu leo quam. Pellentesque ornare sem lacinia quam venenatis vestibulum.</p><p>Maecenas sed diam eget risus varius blandit sit amet non magna. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Donec id elit non mi porta gravida at eget metus. Duis mollis, est non commodo luctus, nisi erat porttitor ligula, eget lacinia odio sem nec elit.</p><p>Aenean lacinia bibendum nulla sed consectetur. Vivamus sagittis lacus vel augue laoreet rutrum faucibus dolor auctor. Cras justo odio, dapibus ac facilisis in, egestas eget quam. Sed posuere consectetur est at lobortis.</p>`;

export const newsData: Article[] = [
    { id: 0, title: "Bitcoin Hits New All-Time High Amidst Institutional Adoption", source: "CoinDesk", time: "2 hours ago", imageText: "Bitcoin", imageColor: "8B5CF6", content: longArticleContent, sentiment: 'positive', tags: ['Bitcoin', 'Institutional'], takeaway: "Strong institutional buying and ETF approvals have pushed Bitcoin to a new price record, signaling mainstream acceptance." },
    { id: 1, title: "Ethereum's Next Upgrade 'Prague' to Focus on Scalability", source: "The Block", time: "5 hours ago", imageText: "DeFi", imageColor: "A78BFA", content: longArticleContent, sentiment: 'positive', tags: ['Ethereum', 'DeFi', 'Scalability'], takeaway: "The upcoming 'Prague' upgrade aims to drastically improve transaction speeds and lower fees to support dApp growth." },
    { id: 2, title: "Global Regulators Meet to Discuss Unified Crypto Framework", source: "Reuters", time: "1 day ago", imageText: "Regulation", imageColor: "C4B5FD", content: longArticleContent, sentiment: 'neutral', tags: ['Regulation', 'G20'], takeaway: "G20 nations are working on standardized crypto rules to enhance consumer protection and market stability." },
    { id: 3, title: "Altcoin Market Sees Resurgence as 'AI Coins' Lead the Pack", source: "CryptoSlate", time: "1 day ago", imageText: "AI", imageColor: "8B5CF6", content: longArticleContent, sentiment: 'positive', tags: ['Altcoins', 'AI'], takeaway: "A surge in investor interest around AI-related blockchain projects is driving a significant rally in the altcoin market." },
    { id: 4, title: "SEC Delays Decision on Spot Ethereum ETF Applications", source: "Cointelegraph", time: "2 days ago", imageText: "SEC", imageColor: "A78BFA", content: longArticleContent, sentiment: 'negative', tags: ['Ethereum', 'Regulation', 'SEC'], takeaway: "The U.S. Securities and Exchange Commission has once again postponed its decision on several spot Ether ETF filings, creating market uncertainty." },
    { id: 5, title: "Solana Network Experiences Major Outage, Raising Concerns", source: "Decrypt", time: "2 days ago", imageText: "Solana", imageColor: "C4B5FD", content: longArticleContent, sentiment: 'negative', tags: ['Solana', 'Scalability'], takeaway: "A significant network outage on the Solana blockchain has renewed debates about its stability and centralization." },
    { id: 6, title: "NFT Market Shows Signs of Cooling Off After Record-Breaking Year", source: "NFT Evening", time: "3 days ago", imageText: "NFTs", imageColor: "8B5CF6", content: longArticleContent, sentiment: 'neutral', tags: ['NFTs'], takeaway: "Trading volumes for non-fungible tokens have declined, suggesting a potential market correction or stabilization phase." },
    { id: 7, "title": "The Metaverse Land Grab: Is Virtual Real Estate the Future?", source: "Forbes", time: "3 days ago", imageText: "Metaverse", imageColor: "A78BFA", content: longArticleContent, sentiment: 'neutral', tags: ['Metaverse', 'NFTs'], takeaway: "Major brands and investors are purchasing digital land in metaverses like Decentraland, betting on a future of virtual interaction." },
    { id: 8, "title": "US Treasury Proposes New Regulations for Stablecoin Issuers", source: "Wall Street Journal", time: "4 days ago", imageText: "Stablecoin", imageColor: "C4B5FD", content: longArticleContent, sentiment: 'neutral', tags: ['Regulation', 'Stablecoins'], takeaway: "The U.S. Treasury Department is pushing for bank-like regulations for stablecoin issuers to mitigate systemic financial risks." },
    { id: 9, "title": "Cardano Announces Successful Launch of New DeFi Protocols", source: "Cardano Feed", time: "4 days ago", imageText: "Cardano", imageColor: "8B5CF6", content: longArticleContent, sentiment: 'positive', tags: ['Cardano', 'DeFi'], takeaway: "The Cardano ecosystem is expanding with the launch of several new decentralized finance applications following recent network upgrades." },
    { id: 10, "title": "Polkadot Parachain Auctions Continue to Attract High Bids", source: "PolkaWorld", time: "5 days ago", imageText: "Polkadot", imageColor: "A78BFA", content: longArticleContent, sentiment: 'positive', tags: ['Polkadot'], takeaway: "Competition for parachain slots on the Polkadot network remains fierce, highlighting strong developer interest in its ecosystem." },
    { id: 11, "title": "Privacy Coins Face Increased Scrutiny from Global Watchdogs", source: "The Block", time: "5 days ago", imageText: "Privacy", imageColor: "C4B5FD", content: longArticleContent, sentiment: 'negative', tags: ['Regulation', 'Privacy'], takeaway: "Regulators are increasing pressure on exchanges to delist privacy-focused cryptocurrencies like Monero and Zcash." },
    { id: 12, "title": "Binance Expands Services in South East Asia", source: "Binance Blog", time: "6 days ago", imageText: "Binance", imageColor: "8B5CF6", content: longArticleContent, sentiment: 'positive', tags: ['Exchange', 'Binance'], takeaway: "Binance is launching new localized platforms and services to capture the growing crypto market in South East Asia." },
    { id: 13, "title": "Major Gaming Studios Form Blockchain Gaming Alliance", source: "VentureBeat", time: "1 week ago", imageText: "Gaming", imageColor: "A78BFA", content: longArticleContent, sentiment: 'positive', tags: ['Gaming', 'NFTs', 'Metaverse'], takeaway: "A consortium of established video game developers has formed to promote standards and interoperability in blockchain gaming." },
    { id: 14, "title": "China's Digital Yuan CBDC Pilot Expands to New Cities", source: "South China Morning Post", time: "1 week ago", imageText: "CBDC", imageColor: "C4B5FD", content: longArticleContent, sentiment: 'neutral', tags: ['Regulation', 'CBDC'], takeaway: "The pilot program for China's central bank digital currency is being rolled out to more cities, moving closer to a full launch." },
    { id: 15, "title": "$50 Million Exploited from DeFi Lending Protocol", source: "Rekt News", time: "1 week ago", imageText: "Hack", imageColor: "8B5CF6", content: longArticleContent, sentiment: 'negative', tags: ['DeFi', 'Hack'], takeaway: "A flash loan attack has resulted in the loss of $50 million from a popular decentralized lending platform, highlighting ongoing security risks." },
    { id: 16, "title": "VC Investment in Web3 Startups Reaches New Quarterly High", source: "TechCrunch", time: "1 week ago", imageText: "Web3", imageColor: "A78BFA", content: longArticleContent, sentiment: 'positive', tags: ['Web3', 'Institutional'], takeaway: "Venture capital firms are pouring record amounts of funding into Web3 and crypto startups, signaling long-term bullish sentiment." },
];

export const categories = ['All', 'Bitcoin', 'DeFi', 'Regulation', 'AI', 'Ethereum', 'Altcoins', 'Solana', 'NFTs', 'Metaverse', 'Stablecoins', 'Cardano', 'Polkadot', 'Privacy', 'Exchange', 'Gaming', 'CBDC', 'Hack', 'Web3', 'Institutional'];

export const initialComments: Comment[] = [
    { author: 'Satoshi N.', avatarText: 'AV', text: "Great analysis on the institutional adoption. This is the catalyst we've been waiting for." },
    { author: 'Vitalik B.', avatarText: 'AV', text: "The Prague upgrade can't come soon enough. Scalability is key for the next wave of dApps." }
];
