const mongoose = require('mongoose');
const customAiDbConnection = require("../../config/customAiDb");

/**
 * Stores the detailed results of a N8nWorkflowJob.
 * This schema holds all queryable data.
 * Large text/blobs (like code and SVG) are stored in GridFS
 * and referenced by their ObjectId.
 */
const N8nJobResponseSchema = new mongoose.Schema(
    {
        /**
         * The parent job this response belongs to.
         */
        jobId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'N8nWorkflowJob',
            required: true,
            index: true,
        },

        // --- Top-Level Response Metadata ---
        status: { type: String, trim: true }, // "Success"
        requestID: { type: String, trim: true }, // "UAS3419847107"
        attempt: { type: Number }, // 1

    // --- Original Input ---
    input: {
        originalPrompt: { type: String },
        cleanedPrompt: { type: String },
        experienceLevel: { type: String },
        backtestSymbol: { type: String },
        backtestInterval: { type: String },
    },

    modelUsed: { type: String, trim: true },

    // --- Generated Code & Summary ---
    generatedCode: {
        summary: {
            overview: { type: String },
            executionLogic: { type: String },
            longEntryCondition: { type: String },
            shortEntryCondition: { type: String },
            otherConditions: { type: String },
        },
        /**
         * ObjectId of the generated JS code file in GridFS.
         */
        generatedCodeFileId: {
            type: mongoose.Schema.Types.ObjectId,
                required: true,
        },
        fullCode: { type: String },
    },

    // --- Backtest Results ---
    backtest: {
        status: { type: String }, // "Success"
        errorMessage: { type: String, default: null },
        roi: { type: String },
        winRatio: { type: String },
        simulatedTrades: { type: Number },
        profitFactor: { type: String },
        sharpeRatio: { type: String },
        sortinoRatio: { type: String },
        maxDrawdown: { type: String },
        avgTradePnL: { type: String },
        avgDuration: { type: String },
        exposureTime: { type: String },

        /**
         * The parsed JSON array of trades.
         */
        tradeLog: {
            type: mongoose.Schema.Types.Mixed, // Storing the array is fine
        default: [],
        },
        /**
         * ObjectId of the balance sketch SVG file in GridFS.
         */
        balanceSketchFileId: {
            type: mongoose.Schema.Types.ObjectId,
                required: true,
        },
        fullBalanceSketch: { type: String },
    },
    feedback: { type: String },
},
{
    timestamps: true, // Adds createdAt and updatedAt
}
);

const CustomAIJobResponse_DefaultDB = mongoose.model('N8nJobResponse', N8nJobResponseSchema);

const N8nJobResponse_CustomAiDB = customAiDbConnection.model('N8nJobResponse', N8nJobResponseSchema);

module.exports = {
    CustomAIJobResponse_DefaultDB,
    N8nJobResponse_CustomAiDB
};
