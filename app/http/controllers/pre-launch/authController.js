const AlgoTraderProfile = require('../../../models/AlgoTraderProfile');
const AlgorithmPrompt = require('../../../models/AlgorithmPrompt');
const logger = require("../../../../logs/logger");
const n8nService = require("../../../services/n8nService");

exports.storeEarlyAccessInfo = async (req, res) => {
    try {
        const {
            name,
            nickname,
            email,
            promptTitle,
            promptText,
        } = req.body;

        if (!email || email.toLowerCase() === 'admin@unitedalgos.com') {
            return res.status(400).json({success: false, error: 'Email is required.'});
        }

        if (!promptText) {
            return res.status(400).json({success: false, error: 'Algorithm prompt is required.'});
        }

        const algoTraderProfile = await AlgoTraderProfile.findOneAndUpdate(
            { email },
            {
                $set: {
                    name,
                    nickname
                },
                $setOnInsert: {
                    email // Only set email if we are creating a new doc
                }
            },
            {
                upsert: true,
                new: true,
                runValidators: true
            }
        );

        const algorithmPromptModel = await AlgorithmPrompt.create({
            AlgoTraderProfileId: algoTraderProfile._id,
            promptTitle,
            promptText,
        });

        // show the response to the user
        res.json({success: true, data: {algorithmPromptId: algorithmPromptModel._id}});

        await n8nService.initiateAsyncWorkflow(algorithmPromptModel._id, req.body.promptText, '/6ac4dc06-43b7-40a9-839c-fe2f9466579e', 'prompt');

    } catch (error) {
        logger.error(`getAssetsDistribution error: ${error.message}`, {stack: error.stack});
        res.status(500).json({success: false, error: error.message});
    }
}
