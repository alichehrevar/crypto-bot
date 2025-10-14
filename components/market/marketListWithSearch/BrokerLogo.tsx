import React from 'react';
import Image from 'next/image';

export const BrokerLogo: React.FC<{ broker: string }> = ({ broker }) => {

    switch (broker) {
        case 'Binance': return <Image alt="binance" height={12} src="/images/logos/market/binance-logo.png" width={12} />;
        case 'OKX': return <Image alt="okx" height={12} src="/images/logos/market/okx-logo.svg" width={12} />;
        case 'BingX': return <Image alt="okx" height={12} src="/images/logos/market/bingx-logo.png" width={12} />;
        // ... other cases
        default: return <Image alt="united-algos" height={12} src="/images/logos/logo-white.png" width={12} />;
    }
};
