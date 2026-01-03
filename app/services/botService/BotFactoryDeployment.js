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
            marketSnapshot = await MarketSnapshot.findOne({ name: "Binance", symbol: "BTC", category: "Spot" });
        }
        if (!marketSnapshot) throw new Error('Invalid symbol selected.');

        // 3. Delegate to specific builder
        switch (type.toLowerCase()) {
            case 'grid':
                return this._createGridBot(payload, userId, account, accountType, marketSnapshot);
            case 'technical':
            case 'indicator': // Support legacy name
                return this._createTechnicalBot(payload, userId, account, accountType, marketSnapshot);
            case 'dca':
                return this._createDcaBot(payload, userId, account, accountType, marketSnapshot);
            default:
                throw new Error(`Unsupported bot type: ${type}`);
        }
    }

    // --- Builders ---

    static async _createGridBot(data, userId, account, accountType, marketSnapshot) {
        // Validation logic extracted from your original createGridBot
        const gridConfig = {
            lowerPrice: Number(data.lowerPrice),
            upperPrice: Number(data.upperPrice),
            grids: Number(data.grids || data.gridCount),
            investment: Number(data.investment),
            gridMode: (data.gridMode || 'arithmetic').toUpperCase(),
            gridStepPercentage: 0.01,
            stopLossPct: 0,
            takeProfitPct: 0,
            flattenOnExit: data.flattenOnExit === true || data.flattenOnExit === 'true'
        };

        if (gridConfig.lowerPrice >= gridConfig.upperPrice) {
            throw new Error('Lower price must be less than Upper price.');
        }

        return await GridBotModel.create({
            botType: 'grid',
            name: data.name,
            symbol: marketSnapshot.symbol,
            timeframe: '1h', // Required field by BotBase
            userId,
            accountType,
            accountId: account._id,
            active: true,
            marketType: data.marketType || 'SPOT', // Default to SPOT if missing

            // Configs
            marketInfo: {
                baseFund: Number(data.baseFund) || 10000,
                tradeFund: Number(data.investment) || 50
            },
            tradeInfo: {
                leverageLong: 1,
                leverageShort: 1,
                botTakeProfit: Number(data.takeProfitPrice) || null,
                botStopLoss: Number(data.stopLossPrice) || null,
            },
            gridConfig,
            riskStrategy: 'SimpleStrategy',
            mode: 'live', // Default to live as per your form, or toggle via payload

            // Extra Grid Fields
            triggerPrice: data.triggerPrice ? Number(data.triggerPrice) : null,
            trailingUp: data.trailingUp === true,
            direction: data.direction, // Futures specific
            leverage: data.leverage,
            marginMode: data.marginMode
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
            marketType: data.marketType || 'SPOT',

            riskStrategy: 'SimpleStrategy',
            riskParams: {
                positionSizingMethod: data.compoundPositionSizing ? 'compound' : 'simple'
            },
            marketInfo: {
                baseFund: Number(data.baseFund) || 10000,
                tradeFund: Number(data.tradeFund) || 50
            },
            tradeInfo: {
                takeProfit: Number(data.takeProfit),
                stopLoss: Number(data.stopLoss),
                leverageLong: Number(data.leverageLong) || 1,
                leverageShort: Number(data.leverageShort) || 1,
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
        // Using the DcaBotModel we defined earlier
        return await DcaBotModel.create({
            botType: 'dca',
            name: data.name,
            userId,
            accountType,
            accountId: account._id,
            symbol: marketSnapshot.symbol, // BotBase requires symbol string
            marketType: 'SPOT', // Defaulting to Spot for DCA usually
            active: true,

            // Map Payload
            direction: data.direction, // 'LONG' or 'SHORT'
            priceDeviation: Number(data.priceDeviation),
            takeProfit: Number(data.takeProfit),
            baseOrderVolume: Number(data.baseOrderVolume),
            safetyOrderVolume: Number(data.safetyOrderVolume),
            maxSafetyOrders: Number(data.maxSafetyOrders),

            // Advanced
            triggerPrice: Number(data.triggerPrice),
            stepScale: Number(data.stepScale),
            volumeScale: Number(data.volumeScale),
            lowerPrice: Number(data.lowerPrice),
            upperPrice: Number(data.upperPrice),
            stopLoss: Number(data.stopLoss),
            terminateOnStopLoss: data.terminateOnStopLoss,

            // Initialize Metrics
            averageEntryPrice: 0,
            totalVolume: 0,
            completedDeals: 0
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
