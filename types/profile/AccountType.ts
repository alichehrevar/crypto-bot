export type ExchangeAccount = {
  _id: string;
  userId: string;
  apiKey: string;
  secretKey: string;
  createdAt: string;
  name?: string;
  __v: number;
};

export type AccountsResponse = {
  message: string;
  accounts: {
    [exchange: string]: Partial<ExchangeAccount>;
  };
};

export type AccountData = {
  _id: string;
  userId: string;
  apiKey: string;
  secretKey: string;
  createdAt: string;
  permissions: []
}

export type AccountResponse = {
  message: string;
  account?: AccountData;
};
