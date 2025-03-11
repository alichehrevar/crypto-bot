/**
 * BestIndicatorsTable.js
 *
 * This file exports a mapping of market range and timeframe to the best technical indicators
 * (and their recommended parameter settings) for optimizing profit and win‐ratio.
 *
 * Each key is a combination of "Range|Timeframe" and the value is an array of indicator recommendations.
 * For example:
 *   "High Trend|1m" maps to an array of strings describing the recommended indicators.
 *
 * You can later update your optimization routines to use this table.
 */

const BestIndicatorsTable = {
    // High Trend
    "High Trend|1m": [
        "Moving Average Crossover (5,10)",
        "MACD (5,10,5)",
        "ADX (7)",
        "Parabolic SAR (0.02,0.2)",
        "Aroon Indicator (10)",
        "ADX Directional Movement"
    ],
    "High Trend|5m": [
        "Moving Average Crossover (10,20)",
        "MACD (10,20,10)",
        "Ichimoku Cloud (9,21,26,9)",
        "Trix (9)",
        "Elder Ray Index",
        "ADX Trend Strength"
    ],
    "High Trend|15m": [
        "Moving Average Crossover (20,50)",
        "MACD (12,26,9)",
        "Ichimoku Cloud (9,21,26,9)",
        "Aroon Indicator (25)",
        "Alligator Indicator (13,8,5)",
        "Ichimoku Conversion Line"
    ],
    "High Trend|1h": [
        "Moving Average Crossover (50,200)",
        "MACD (12,26,9)",
        "ADX (14)",
        "Elder Ray Index",
        "Keltner Channels (20,10)",
        "Ichimoku Base Line"
    ],
    "High Trend|4h": [
        "Moving Average Crossover (100,200)",
        "MACD (12,26,9)",
        "Ichimoku Cloud (9,21,26,9)",
        "Parabolic SAR (0.02,0.2)",
        "Donchian Channels (20)",
        "Ichimoku Leading Span A"
    ],
    "High Trend|1d": [
        "Moving Average Crossover (50,200)",
        "MACD (12,26,9)",
        "ADX (14)",
        "Linear Regression Slope",
        "Regression Channel",
        "Ichimoku Leading Span B"
    ],

    // Near Random
    "Near Random|1m": [
        "MA (5)",
        "Stochastic Oscillator (5,3,70,30)",
        "RSI (7,70,30)",
        "Momentum Indicator (5)",
        "Price Rate of Change (5)",
        "ATR (10)",
        "Zig Zag Indicator"
    ],
    "Near Random|5m": [
        "MA (10)",
        "Stochastic Oscillator (10,3,70,30)",
        "RSI (14,70,30)",
        "Momentum Indicator (10)",
        "Price Rate of Change (10)",
        "Standard Deviation (10)",
        "Fractal Up and Down"
    ],
    "Near Random|15m": [
        "MA (20)",
        "Stochastic Oscillator (14,3,70,30)",
        "RSI (14,70,30)",
        "Momentum Indicator (14)",
        "Price Rate of Change (14)",
        "Bollingers Band Width (20,2)",
        "Pivot Points"
    ],
    "Near Random|1h": [
        "MA (50)",
        "Stochastic Oscillator (14,3,70,30)",
        "RSI (14,70,30)",
        "Momentum Indicator (20)",
        "Price Rate of Change (20)",
        "Candlestick Patterns",
        "Fibonacci Retracement"
    ],
    "Near Random|4h": [
        "MA (100)",
        "Stochastic Oscillator (14,3,70,30)",
        "RSI (14,70,30)",
        "Momentum Indicator (30)",
        "Price Rate of Change (30)",
        "Candlestick Patterns",
        "Heikin Ashi Charts"
    ],
    "Near Random|1d": [
        "MA (200)",
        "Stochastic Oscillator (14,3,70,30)",
        "RSI (14,70,30)",
        "Momentum Indicator (50)",
        "Price Rate of Change (50)",
        "Candlestick Patterns",
        "Point and Figure Charts"
    ],

    // Reversal
    "Reversal|1m": [
        "Bollingers Bands (20,2)",
        "RSI (7,70,30)",
        "Stochastic Oscillator (5,3,70,30)",
        "CCI (10,100,-100)",
        "Williams %R (7)",
        "MACD Histogram"
    ],
    "Reversal|5m": [
        "Bollingers Bands (20,2)",
        "RSI (14,70,30)",
        "Stochastic Oscillator (10,3,70,30)",
        "CCI (14,100,-100)",
        "Elder's Force Index (13)",
        "RSI Divergence"
    ],
    "Reversal|15m": [
        "Bollingers Bands (20,2)",
        "RSI (14,70,30)",
        "Stochastic Oscillator (14,3,70,30)",
        "CCI (14,100,-100)",
        "Money Flow Index (14)",
        "Stochastic %K and %D"
    ],
    "Reversal|1h": [
        "Bollingers Bands (20,2)",
        "RSI (14,70,30)",
        "Stochastic Oscillator (14,3,70,30)",
        "CCI (14,100,-100)",
        "On-Balance Volume (OBV)",
        "Mass Index"
    ],
    "Reversal|4h": [
        "Bollingers Bands (20,2)",
        "RSI (14,70,30)",
        "Stochastic Oscillator (14,3,70,30)",
        "CCI (14,100,-100)",
        "Accumulation/Distribution Line",
        "Vortex Indicator"
    ],
    "Reversal|1d": [
        "Bollingers Bands (20,2)",
        "RSI (14,70,30)",
        "Stochastic Oscillator (14,3,70,30)",
        "CCI (14,100,-100)",
        "Chaikin Oscillator",
        "KST Oscillator"
    ]
};

module.exports = BestIndicatorsTable;
