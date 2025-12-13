const mongoose = require('mongoose');
const { N8nWorkflowJob_CustomAiDB } = require('../../../models/N8nWorkflowJob');
const n8nService = require('../../../services/n8nService');

async function triggerAsync(req, res) {
    try {
        const job = await n8nService.initiateAsyncWorkflow(req.user.id, req.body.payload, '/6ac4dc06-43b7-40a9-839c-fe2f9466579e', 'ai-model');

        return res.status(202).json({
            success: true,
            message: 'Workflow accepted and is processing.',
            jobId: job._id,
        });
    } catch (error) {
        // Handle known service errors if you want specific 400 codes
        if (error instanceof n8nService.ServiceError && error.type === 'VALIDATION') {
            return res.status(400).json({ success: false, message: error.message });
        }
        // Generic fallback
        return res.status(500).json({ success: false, message: error.message });
    }
}

async function promptSubmission(req, res) {
    try {
        const job = await n8nService.initiateAsyncWorkflow(req.user.id, req.body.payload, '/217b07f3-a235-46da-8e9e-9fe760b7ae0a', 'prompt');

        return res.status(202).json({
            success: true,
            message: 'Workflow accepted and is processing.',
            jobId: job._id,
        });
    } catch (error) {
        // Handle known service errors if you want specific 400 codes
        if (error instanceof n8nService.ServiceError && error.type === 'VALIDATION') {
            return res.status(400).json({ success: false, message: error.message });
        }
        // Generic fallback
        return res.status(500).json({ success: false, message: error.message });
    }
}

async function getJobStatus(req, res) {
    try {
        const jobStatus = await n8nService.getJobStatus(req.params.id, req.user.id);

        return res.status(200).json({
            success: true,
            job: jobStatus,
        });
    } catch (error) {
        // Handle specific service errors to return correct HTTP codes
        if (error instanceof n8nService.ServiceError) {
            switch (error.type) {
                case 'NOT_FOUND': return res.status(404).json({ success: false, message: error.message });
                case 'FORBIDDEN': return res.status(403).json({ success: false, message: error.message });
            }
        }
        // Generic fallback
        return res.status(500).json({ success: false, message: error.message });
    }
}

async function simulateImport (req, res) {
    try {
        const testData = {
            // Raw MongoDB driver requires explicit _id if you want to control it,
            // otherwise it auto-generates one. Let's auto-generate one here for safety.
            _id: new mongoose.Types.ObjectId(),

            // This needs to be a valid ObjectId string or object for Mongo
            userId: new mongoose.Types.ObjectId('68d7b4ac26dafccd478bea51'),

            type: 'ai-model',
            status: 'completed',
            webhookPath: 'test-simulation-path',

            // INTENTIONALLY BAD DATA (According to Schema)
            // Schema expects ObjectId, but we insert a full Object to mimic n8n
            response: {
                status: "Success",
                requestID: "UAS-10",
                attempt: 1,
                input: {
                    originalPrompt: "I want an entry-only prompt for an automated trading bot...",
                    cleanedPrompt: "Enter long when MACD line crosses above MACD signal...",
                    experienceLevel: "Beginner",
                    backtestSymbol: "BTCUSDT",
                    backtestInterval: "5m"
                },
                generatedCode: {
                    code: "const BaseIndicator = require('./BaseIndicator');...",
                    summary: {
                        overview: "The strategy is designed for momentum-driven markets...",
                        executionLogic: "On each new candle...",
                        longEntryCondition: "MACD bullish cross...",
                        shortEntryCondition: "MACD bearish cross...",
                        otherConditions: "N/A"
                    }
                },
                backtest: {
                    status: "Success",
                    roi: "-5.88%",
                    winRatio: "0.00%",
                    simulatedTrades: 3,
                    signalDistribution: "{\"BUY\":12,\"SELL\":10,\"HOLD\":977,\"ERROR\":0}",
                    tradeLog: "[{\"Trade\":1,\"Direction\":\"Long\"...}]"
                }
            },
            // Add timestamps manually because bypassing mongoose skips auto-timestamps
            createdAt: new Date(),
            updatedAt: new Date()
        };

        // 🚀 BYPASS MONGOOSE VALIDATION
        // Access the native MongoDB collection driver directly
        await N8nWorkflowJob_CustomAiDB.collection.insertOne(testData);

        return res.status(200).json({
            message: '✅ Test data inserted (Validation Bypassed).',
            info: 'This simulated an n8n write. Check your console for the sync log.',
            insertedId: testData._id
        });

    } catch (error) {
        console.error('Test Import Error:', error);
        return res.status(500).json({ error: error.message });
    }
}

module.exports = { triggerAsync, promptSubmission, getJobStatus, simulateImport };
