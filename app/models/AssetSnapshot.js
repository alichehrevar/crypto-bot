// models/AssetSnapshot.js
/**
 * Daily asset snapshot: fast totals + UI trees + full broker/account details.
 */
const mongoose = require('mongoose');

/* -------------------- Reusable leaf schemas -------------------- */

const BalanceRowSchema = new mongoose.Schema(
    {
        asset:  { type: String, required: true }, // e.g., 'BTC', 'USDT'
        free:   { type: Number, default: 0 },     // available
        locked: { type: Number, default: 0 },     // in orders/locked
        amount: { type: Number, default: 0 },     // free + locked (or native amount)
        value:  { type: Number, default: 0 },     // valuation in USDT (or meta.currency)
    },
    { _id: false }
);

const PositionSchema = new mongoose.Schema(
    {
        symbol:         { type: String, required: true }, // 'BTCUSDT' / 'BTC-PERP'
        side:           { type: String, enum: ['LONG','SHORT','BOTH','UNKNOWN'], default: 'UNKNOWN' },
        size:           { type: Number, default: 0 },     // base units or contracts (normalized if possible)
        leverage:       { type: Number, default: 0 },
        marginType:     { type: String, enum: ['ISOLATED','CROSS','UNKNOWN'], default: 'UNKNOWN' },
        entryPrice:     { type: Number, default: 0 },
        markPrice:      { type: Number, default: 0 },
        liqPrice:       { type: Number, default: 0 },
        notional:       { type: Number, default: 0 },     // abs(notional) often used for display
        unrealizedPnl:  { type: Number, default: 0 },
    },
    { _id: false }
);

const EarnProductSchema = new mongoose.Schema(
    {
        product:  { type: String, required: true }, // 'Savings' | 'Staking' | 'Launchpool' | ...
        asset:    { type: String, required: true },
        amount:   { type: Number, default: 0 },
        value:    { type: Number, default: 0 },
        apy:      { type: Number, default: 0 },
        lockType: { type: String, default: '' },    // 'Flexible', 'Locked 30d', etc.
    },
    { _id: false }
);

const LiabilitySchema = new mongoose.Schema(
    {
        asset:  { type: String, required: true },   // borrowed asset for margin, etc.
        amount: { type: Number, default: 0 },
        value:  { type: Number, default: 0 },
        type:   { type: String, default: 'MarginLoan' },
    },
    { _id: false }
);

/* -------------------- Per-account “bucket” -------------------- */
/**
 * Canonical account types across brokers:
 * - Spot, Margin, Funding, Futures, Earn, Savings, Staking, Pool, Other
 * Futures bucket value is typically: walletBalance + totalUnrealizedPnl
 * Other buckets sum child values (balances/products - liabilities).
 */
const AccountBucketSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ['Spot','Margin','Funding','Futures','Earn','Savings','Staking','Pool','Other'],
            required: true
        },
        subType:            { type: String, default: '' },  // e.g., 'USDT-M', 'COIN-M', 'Cross', 'Isolated'
        mode:               { type: String, default: '' },

        balances:           { type: [BalanceRowSchema], default: [] }, // Spot/Funding/Margin
        products:           { type: [EarnProductSchema], default: [] },// Earn/Savings/Staking
        liabilities:        { type: [LiabilitySchema], default: [] },  // margin loans, etc.
        positions:          { type: [PositionSchema], default: [] },   // Futures/Margin

        walletBalance:      { type: Number, default: 0 },   // esp. for futures wallet
        availableBalance:   { type: Number, default: 0 },
        totalUnrealizedPnl: { type: Number, default: 0 },

        value:              { type: Number, default: 0 },   // rolled-up bucket value
    },
    { _id: false }
);

/* -------------------- Per-broker details -------------------- */

const BrokerTotalsSchema = new mongoose.Schema(
    {
        spot:    { type: Number, default: 0 },
        margin:  { type: Number, default: 0 },
        funding: { type: Number, default: 0 },
        futures: { type: Number, default: 0 },
        earn:    { type: Number, default: 0 },
        overall: { type: Number, default: 0 },
    },
    { _id: false }
);

const BrokerDetailsSchema = new mongoose.Schema(
    {
        broker:   { type: String, required: true },  // 'Binance' | 'OKX' | 'BingX'
        color:    { type: String, default: '' },
        accounts: { type: [AccountBucketSchema], default: [] },
        totals:   { type: BrokerTotalsSchema, default: () => ({}) },
    },
    { _id: false }
);

/* -------------------- UI tree schemas -------------------- */
/** Broker tree: 'Total Holdings' -> Broker -> (Spot | Future | Fund | Funding | Margin) -> assets/children */
const BrokerTreeLeafSchema = new mongoose.Schema(
    {
        name:  { type: String, required: true },   // asset symbol or child label (e.g., 'USDT', 'Wallet', 'Launchpool')
        value: { type: Number, required: true },
        // optional for some leaves (e.g., spot assets)
        amount:{ type: Number, default: 0 },
    },
    { _id: false }
);

const BrokerTreeAccountNodeSchema = new mongoose.Schema(
    {
        name:     { type: String, required: true }, // 'Spot' | 'Future' | 'Fund' | 'Funding' | 'Margin'
        value:    { type: Number, required: true },
        children: { type: [BrokerTreeLeafSchema], default: [] },
    },
    { _id: false }
);

const BrokerTreeBrokerNodeSchema = new mongoose.Schema(
    {
        name:     { type: String, required: true }, // Broker name
        color:    { type: String },
        value:    { type: Number, required: true },
        children: { type: [BrokerTreeAccountNodeSchema], default: [] },
    },
    { _id: false }
);

const BrokerTreeSchema = new mongoose.Schema(
    {
        name:     { type: String, required: true }, // 'Total Holdings'
        value:    { type: Number, required: true },
        children: { type: [BrokerTreeBrokerNodeSchema], default: [] },
    },
    { _id: false }
);

/** Asset tree: 'Total Assets' -> Asset -> [{ name: Broker, value, color? }] */
const AssetTreeBrokerSplitSchema = new mongoose.Schema(
    {
        name:  { type: String, required: true }, // broker name
        value: { type: Number, required: true },
        color: { type: String },
    },
    { _id: false }
);

const AssetTreeNodeSchema = new mongoose.Schema(
    {
        name:     { type: String, required: true }, // asset symbol (e.g., 'BTC', 'USDT')
        color:    { type: String },
        value:    { type: Number, required: true },
        children: { type: [AssetTreeBrokerSplitSchema], default: [] },
    },
    { _id: false }
);

const AssetTreeSchema = new mongoose.Schema(
    {
        name:     { type: String, required: true }, // 'Total Assets'
        value:    { type: Number, required: true },
        children: { type: [AssetTreeNodeSchema], default: [] },
    },
    { _id: false }
);

/* -------------------- Main snapshot schema -------------------- */

const AssetSnapshotSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },

        /**
         * Snapshot date at UTC midnight (one per day).
         */
        timestamp: {
            type: Date,
            required: true,
        },

        /**
         * Quick totals by exchange (overall, not just Spot).
         */
        balances: {
            binance: { type: Number, default: 0 },
            okx:     { type: Number, default: 0 },
            bingx:   { type: Number, default: 0 },
        },

        /**
         * Combined total across exchanges (should equal brokerTree.value when fully populated).
         */
        total: { type: Number, default: 0 },

        /**
         * UI-ready trees (present for "today"; historical backfills may set null).
         */
        brokerTree: { type: BrokerTreeSchema, default: null },
        assetTree:  { type: AssetTreeSchema,  default: null },

        /**
         * Full normalized details per broker (everything we could fetch).
         */
        details: { type: [BrokerDetailsSchema], default: [] },

        /**
         * Metadata about snapshot construction/pricing.
         */
        meta: {
            currency:   { type: String, default: 'USDT' },
            builtFrom:  { type: [String], default: [] },   // ['binance','okx','bingx']
            notes:      { type: String, default: '' },
            generatedAt:{ type: Date,   default: () => new Date() },
            priceInfo: {
                missing:  { type: [String], default: [] },   // assets we failed to price
                source:   { type: String,   default: 'coingecko' },
            },
            schemaVersion: { type: Number, default: 2 }     // bump if structure changes
        }
    },
    { timestamps: true }
);

// One snapshot per user per day
AssetSnapshotSchema.index({ userId: 1, timestamp: 1 }, { unique: true });

module.exports = mongoose.model('AssetSnapshot', AssetSnapshotSchema);
