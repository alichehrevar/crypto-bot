// src/utils/gridCalculator.ts
import Decimal from 'decimal.js';

// --- Configuration ---
if (Decimal.precision < 30) {
    Decimal.set({ precision: 30, rounding: Decimal.ROUND_HALF_UP });
}

// --- Type Definitions ---
export type GridMode = 'arithmetic' | 'geometric';

export interface GridCalculationParams {
    lower: Decimal;
    upper: Decimal;
    grids: number;
    mode: GridMode;
    tickSize: Decimal;
}

// --- Core Functions ---

/**
 * Rounds a price to the nearest tick size using a neutral rounding method.
 */
export function roundToTickNeutral(price: Decimal, tick: Decimal): Decimal {
    if (tick.lte(0)) return price;

    let precision = 0;

    try {
        precision = tick.decimalPlaces();
    } catch (e) {
        const s = tick.toString().toLowerCase();

        if (s.includes('e')) {
            precision = Math.abs(parseInt(s.split('e')[1] || '0', 10));
        }
    }

    const rounded = price.div(tick).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).mul(tick);

    return rounded.toDecimalPlaces(precision);
}

/**
 * Calculates, rounds, and validates grid price levels.
 */
export function calculateGridLevels(params: GridCalculationParams): Decimal[] {
    const { lower, upper, grids, mode, tickSize } = params;

    if (lower.gte(upper) || grids < 1 || lower.lte(0)) {
        return [];
    }

    const gridsD = new Decimal(grids);
    let calculatedLines: Decimal[] = [];

    try {
        if (mode === 'arithmetic') {
            const step = upper.sub(lower).div(gridsD);

            calculatedLines = Array.from({ length: grids + 1 }, (_, i) => lower.add(step.mul(i)));
        } else { // geometric
            const ratio = upper.div(lower).pow(gridsD.pow(-1));

            calculatedLines = Array.from({ length: grids + 1 }, (_, i) => lower.mul(ratio.pow(i)));
        }
    } catch (error) {
        console.error("Grid calculation failed:", error);

        return [];
    }

    const roundedLines = calculatedLines.map(p => roundToTickNeutral(p, tickSize));

    roundedLines[0] = roundToTickNeutral(lower, tickSize);
    roundedLines[grids] = roundToTickNeutral(upper, tickSize);

    return [...new Set(roundedLines.map(l => l.toString()))]
        .map(s => new Decimal(s))
        .sort((a, b) => a.cmp(b));
}


// --- API Utility (Binance) ---
const BINANCE_API_BASE = 'https://api.binance.com/api/v3';
const FALLBACK_TICK_SIZE = new Decimal('0.01');

interface PriceFilter {
    filterType: 'PRICE_FILTER';
    tickSize: string;
    [key: string]: any;
}

type SymbolFilter = PriceFilter | { filterType: string; [key: string]: any };

interface SymbolInfo {
    symbol: string;
    filters: SymbolFilter[];
}

interface ExchangeInfo {
    symbols: SymbolInfo[];
}

/**
 * Utility to fetch Tick Size from Binance.
 */
export const fetchSymbolFilters = async (symbol: string): Promise<{ tickSize: Decimal }> => {
    try {
        const response = await fetch(`${BINANCE_API_BASE}/exchangeInfo?symbol=${symbol.toUpperCase()}`);

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        const data: ExchangeInfo = await response.json();
        const symbolInfo = data.symbols?.[0];

        if (symbolInfo) {
            const priceFilter = symbolInfo.filters.find(
                (f): f is PriceFilter => f.filterType === 'PRICE_FILTER'
            );

            if (priceFilter?.tickSize) {
                return { tickSize: new Decimal(priceFilter.tickSize) };
            }
        }
        throw new Error(`PRICE_FILTER not found for symbol ${symbol}`);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        console.warn(`Failed to fetch tick size for ${symbol}: ${message}. Using fallback.`);

        return { tickSize: FALLBACK_TICK_SIZE };
    }
};
