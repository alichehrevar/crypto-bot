export type SymbolFilter = {
    "_id": string,
    "id": string,
    "createdAt": string,
    "imageUrl": string,
    "is_active": boolean,
    "is_new": boolean,
    "name": string,
    "rank": number,
    "symbol": string,
    "type": string,
    "updatedAt": string,
};

export type SymbolFilterResponse = {
  success: boolean;
  data: SymbolFilter[];
  message?: string
};
