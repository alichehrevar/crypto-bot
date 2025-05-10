export type SymbolFilter = {
  lotSize: {
    min: number;
  };
  priceFilter: {
    min: number;
  };
  _id: string;
  symbol: string;
  __v: number;
  active: boolean;
  baseAsset: string;
  quoteAsset: string;
  createdAt: string;
  updatedAt: string;
  exchange: string;
  minNotional: number;
  precision: number;
  imageUrl: string;
};

export type SymbolFilterResponse = {
  success: boolean;
  data: SymbolFilter[];
};
