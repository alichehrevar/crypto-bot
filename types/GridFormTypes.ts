import { Key } from "react";

import { ExchangeAccount } from "@/types/profile/AccountType";

// Using 'BaseProps' for fields needed by multiple components
interface BaseProps {
    loading: boolean;
}

export interface GridCommonFieldsProps extends BaseProps {
    onNameChange: (value: string) => void;
    accounts: ExchangeAccount[];
    selectedAccountId?: Key;
    onAccountChange: (key: Key | null) => void;
    availableBalance: number;
}

export interface GridStrategySetupProps extends BaseProps {
    lowerPrice: string;
    onLowerPriceChange: (value: string) => void;
    upperPrice: string;
    onUpperPriceChange: (value: string) => void;
    priceRangeError: string;
    gridCount: string;
    onGridCountChange: (value: string) => void;
    gridMode: "Arithmetic" | "Geometric";
    onGridModeChange: (value: "Arithmetic" | "Geometric") => void;
    investment: string;
    onInvestmentChange: (value: string) => void;
    investmentError: string;
    availableBalance: number;
}

export interface GridFuturesConfigProps extends BaseProps {
    direction: "Neutral" | "Long" | "Short";
    onDirectionChange: (value: "Neutral" | "Long" | "Short") => void;
    leverage: string;
    onLeverageChange: (value: string) => void;
    marginMode: "Cross" | "Isolated";
    onMarginModeChange: (value: "Cross" | "Isolated") => void;
    openOnCreation: boolean;
    onOpenOnCreationChange: (value: boolean) => void;
}

export interface GridSpotAdvancedProps extends BaseProps {
    trailingUp: boolean;
    onTrailingUpChange: (value: boolean) => void;
    triggerPriceSpot: string;
    onTriggerPriceSpotChange: (value: string) => void;
}

export interface GridTPSLProps extends BaseProps {
    isSpot: boolean;
    enableTPSL: boolean;
    onEnableTPSLChange: (value: boolean) => void;
    takeProfitPrice: string;
    onTakeProfitPriceChange: (value: string) => void;
    stopLossPrice: string;
    onStopLossPriceChange: (value: string) => void;
    sellBaseOnStop: boolean;
    onSellBaseOnStopChange: (value: boolean) => void;
}
