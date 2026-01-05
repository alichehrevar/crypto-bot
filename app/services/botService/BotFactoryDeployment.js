// app/services/botService/BotFactory.js

const GridBotModel = require('../../models/GridBotModel');
const TechnicalBotModel = require('../../models/TechnicalBotModel');
const DcaBotModel = require('../../models/DcaBot');
const MarketSnapshot = require('../../models/MarketSnapshot');

// Account Models
const BinanceAccount = require('../../models/BinanceAccount');
const OkxAccount = require('../../models/OkxAccount');
const BingxAccount = require('../../models/BingxAccount');

class BotFactoryDeployment {

    /**
     * Main entry point to create any bot.
     * @param {string} type - 'grid', 'technical', 'dca'
     * @param {Object} payload - req.body
     * @param {string} userId - req.user.id
     */
    static async createBot(type, payload, userId) {
        // 1. Resolve Account
        const { account, accountType } = await this.findAccount(payload.accountId);
        if (!account) throw new Error('Invalid account selected.');

        // 2. Resolve Market/Symbol
        const symbolStr = payload.symbol;
        let marketSnapshot;
        if (symbolStr && symbolStr !== 'undefined') {
            marketSnapshot = await MarketSnapshot.findById(symbolStr);
        } else {
            // Fallback default
            marketSnapshot = await MarketSnapshot.findOne({
                name: "Binance",
                symbol: "BTC",
                category: "Spot"
            });
        }
        if (!marketSnapshot) throw new Error('Invalid symbol selected.');

        // 3. Delegate to specific builder
        switch (type.toLowerCase()) {
            case 'grid':
                return this._createGridBot(payload, userId, account, accountType, marketSnapshot);
            case 'technical':
                return this._createTechnicalBot(payload, userId, account, accountType, marketSnapshot);
            case 'dca':
                return this._createDcaBot(payload, userId, account, accountType, marketSnapshot);
            default:
                throw new Error(`Unsupported bot type: ${type}`);
        }
    }

    // --- Builders ---

    static async _createGridBot(data, userId, account, accountType, marketSnapshot) {
        // Validate Price Range
        if (Number(data.lowerPrice) >= Number(data.upperPrice)) {
            throw new Error('Lower price must be less than Upper price.');
        }

        // FIXED: Flattening the object.
        // Previously these might have been nested in 'gridConfig' or missing 'exchange'.
        return await GridBotModel.create({
            botType: 'grid',
            name: data.name,
            symbol: marketSnapshot.symbol,
            timeframe: '1h',
            userId,
            active: true,

            // --- Account & Exchange Info ---
            accountId: account._id,
            accountType,
            // FIX 1: Explicitly map 'exchange'.
            // The Schema requires 'exchange', but data.exchange might be missing if relying on accountType.
            exchange: data.exchange || accountType,
            marketType: data.marketType || 'SPOT',

            // --- Grid Strategy Config (Root Level) ---
            // FIX 2: These must be at the ROOT level, not inside an object
            lowerPrice: Number(data.lowerPrice),
            upperPrice: Number(data.upperPrice),
            grids: Number(data.grids || data.gridCount),
            investment: Number(data.investment),
            gridMode: (data.gridMode || 'arithmetic').toUpperCase(),

            // --- Financials ---
            baseFund: Number(data.baseFund) || 0, // Wallet snapshot

            // --- Advanced ---
            triggerPrice: data.triggerPrice ? Number(data.triggerPrice) : null,
            trailingUp: data.trailingUp === true || data.trailingUp === 'true',
            flattenOnExit: data.flattenOnExit === true || data.flattenOnExit === 'true',

            // --- TP/SL ---
            stopLossPrice: data.stopLossPrice ? Number(data.stopLossPrice) : null,
            takeProfitPrice: data.takeProfitPrice ? Number(data.takeProfitPrice) : null,

            // --- Futures Specific ---
            direction: data.direction || 'NEUTRAL',
            leverage: Number(data.leverage) || 1,
            marginMode: data.marginMode || 'ISOLATED',
            openOnCreation: data.openOnCreation === true,

            status: 'INITIALIZING'
        });
    }

    static async _createTechnicalBot(data, userId, account, accountType, marketSnapshot) {
        // Logic adapted from your deployBot
        let indicators = data.indicators;
        if (typeof indicators === 'string') {
            indicators = JSON.parse(indicators);
        }

        if (!Array.isArray(indicators) || indicators.length === 0) {
            throw new Error('At least one indicator is required for Technical Bots.');
        }

        const normalizedTF = (indicators[0].timeFrame || '1h').toLowerCase();

        const formattedIndicators = indicators.map(ind => ({
            name: ind.indicator.name,
            timeframe: (ind.timeFrame || '1h').toString().toLowerCase(),
            params: {} // You might want to map ind.indicator.params here if they exist
        }));

        return await TechnicalBotModel.create({
            botType: 'technical',
            name: data.name,
            symbol: marketSnapshot.symbol,
            timeframe: normalizedTF,
            userId,
            accountType,
            accountId: account._id,
            active: true,
            marketType: data.marketType.toUpperCase() || 'SPOT',

            riskStrategy: 'SimpleStrategy',
            riskParams: {
                // positionSizingMethod: data.compoundPositionSizing ? 'compound' : 'simple'
                positionSizingMethod: 'simple' // simply pass 'simple' for now
            },
            marketInfo: {
                baseFund: Number(data.baseFund) || 10000,
                tradeFund: Number(data.tradeFund) || 50
            },
            tradeInfo: {
                takeProfit: Number(data.takeProfit),
                stopLoss: Number(data.stopLoss),
                positionTakeProfit: Number(data.positionTakeProfit),
                positionStopLoss: Number(data.positionStopLoss),
                leverageLong: data.marketType.toLowerCase() === 'futures' ? (Number(data.leverageLong) || 1) : 1,
                leverageShort: data.marketType.toLowerCase() === 'futures' ? (Number(data.leverageShort) || 1) : 1,
                // Add optimization fields if needed from payload
            },
            indicators: formattedIndicators,
            strategy: data.strategy || 'default',
            fundMode: (data.marginType || 'isolated').toLowerCase(),
            positionMode: (data.positionMode || 'single').toLowerCase(),
            mode: data.mode || 'paper',
            share: data.share
        });
    }

    static async _createDcaBot(data, userId, account, accountType, marketSnapshot) {
        // Helper to handle optional numbers from React forms (avoids NaN)
        const parseOpt = (val, defaultVal = null) => {
            if (val === undefined || val === null || val === '') return defaultVal;
            const num = Number(val);
            return isNaN(num) ? defaultVal : num;
        };

        // Helper for required numbers
        const parseReq = (val, fieldName) => {
            const num = Number(val);
            if (isNaN(num)) throw new Error(`${fieldName} must be a valid number.`);
            return num;
        };

        return await DcaBotModel.create({
            // --- BotBase Fields ---
            botType: 'dca',
            name: data.name,
            userId,
            accountType,
            accountId: account._id,
            symbol: marketSnapshot.symbol,
            marketType: 'SPOT', // DCA default
            active: true,       // Auto-start on deploy
            mode: 'live',       // Form implies live deployment

            // --- DcaBot Specific Fields ---

            // Core Config
            direction: data.direction, // 'long' or 'short'
            priceDeviation: parseReq(data.priceDeviation, 'Price Deviation'),
            takeProfit: parseReq(data.takeProfit, 'Take Profit'),
            baseOrderVolume: parseReq(data.baseOrderVolume, 'Base Order Volume'),
            safetyOrderVolume: parseReq(data.safetyOrderVolume, 'Safety Order Volume'),
            maxSafetyOrders: parseReq(data.maxSafetyOrders, 'Max Safety Orders'),

            // Advanced / Optional
            // We use parseOpt here so empty fields become null/default rather than NaN
            triggerPrice: parseOpt(data.triggerPrice, null),
            stepScale: parseOpt(data.stepScale, 1),
            volumeScale: parseOpt(data.volumeScale, 1),

            lowerPrice: parseOpt(data.lowerPrice, null),
            upperPrice: parseOpt(data.upperPrice, null),

            stopLoss: parseOpt(data.stopLoss, null),
            terminateOnStopLoss: data.terminateOnStopLoss === true || data.terminateOnStopLoss === 'true',

            // Initialize Metrics
            averageEntryPrice: 0,
            totalVolume: 0,
            completedDeals: 0,
            status: 'RUNNING'
        });
    }

    // --- Helper ---
    static async findAccount(accountId) {
        let account = await BinanceAccount.findById(accountId);
        if (account) return { account, accountType: 'binance' };

        account = await OkxAccount.findById(accountId);
        if (account) return { account, accountType: 'okx' };

        account = await BingxAccount.findById(accountId);
        if (account) return { account, accountType: 'bingx' };

        return { account: null, accountType: null };
    }
}

module.exports = BotFactoryDeployment;
