const mongoose = require('mongoose');

/**
 * Anomaly Schema
 * Represents a detected market anomaly that is fed to the frontend.
 */
const anomalySchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ['Volume', 'Funding', 'On-Chain', 'OI', 'Price'],
            required: true,
        },
        asset: {
            type: String,
            required: false, // Not all anomalies might be asset-specific (e.g., market-wide)
        },
        detail: {
            type: String,
            required: true,
        },
        severity: {
            type: String,
            enum: ['High', 'Medium', 'Low'],
            required: true,
        },
    },
    {
        timestamps: true, // Automatically adds createdAt and updatedAt fields
    }
);

const Anomaly = mongoose.model('Anomaly', anomalySchema);

module.exports = Anomaly;
