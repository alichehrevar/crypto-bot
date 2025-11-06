import {Bot} from "@/types/bots/DeployedBots";
import {Bot as BotDetails} from "@/types/bot";
import {ApiBot} from "@/components/bots/BotsList";

export interface Trade {
    _id: string;
    bot: string;
    symbol: string;
    type: string;
    entryPrice: number;
    quantity: number;
    timestamp: string; // ISO Date string
    __v: number;
}


export interface Bots {
    indicator: Bot[];
    grid: Bot[];
}

export interface BotApiResponse {
    success: boolean;
    bots: Bots;
}

export interface BotDetailsApi {
    success: boolean;
    data: ApiBot,
    message: string
}
