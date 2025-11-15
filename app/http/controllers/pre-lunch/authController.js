const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../../../models/User');
const AlgoTraderProfile = require('../../../models/AlgoTraderProfile');
const AlgorithmPrompt = require('../../../models/AlgorithmPrompt');
const logger = require("../../../../logs/logger");
const n8nService = require("../../../services/n8nService");

exports.storeEarlyAccessInfo = async (req, res) => {
    try {
        const {
            email,
            firstName,
            lastName,
            birthday,
            waitlist,
            nickname,
            algorithmPrompt,
        } = req.body;

        if (!email) {
            return res.status(400).json({success: false, error: 'Email is required.'});
        }

        if (!algorithmPrompt) {
            return res.status(400).json({success: false, error: 'Algorithm prompt is required.'});
        }

        let user = await User.findOne({email});
        if (!user) {
            user = await User.create({
                email,
                password: await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10)
            });
        }

        const algoTraderProfile = await AlgoTraderProfile.findOne({userId: user._id});
        if (!algoTraderProfile) {
            await AlgoTraderProfile.create({
                userId: user._id,
                firstName: firstName,
                lastName: lastName,
                phoneCountry: '+0',
                phoneNumber: '0000000000',
                birthday: birthday,
                nickname: nickname,
                waitlist: waitlist,
            })
                .catch(async (userInfoError) => {
                    logger.error(`UserInfo creation error: ${userInfoError.message}`, {stack: userInfoError.stack});
                    // If UserInfo creation fails, delete the User record to prevent orphaned users
                    await User.deleteOne({_id: user._id});
                    return res.status(500).json({success: false, error: 'Failed to create user !'});
                });
        }

        const algorithmPromptModel = await AlgorithmPrompt.create({
            userId: user._id,
            promptText: algorithmPrompt,
        }).catch(async (userInfoError) => {
            logger.error(`UserInfo creation error: ${userInfoError.message}`, {stack: userInfoError.stack});
            // If UserInfo creation fails, delete the User record to prevent orphaned users
            await User.deleteOne({_id: user._id});
            await AlgoTraderProfile.deleteOne({userId: user._id})
            return res.status(500).json({success: false, error: 'Failed to create user !'});
        });

        // show the response to the user
        res.json({success: true, data: {algorithmPromptId: algorithmPromptModel._id}});

        await n8nService.initiateAsyncWorkflow(req.user.id, req.body.promptText, '/6ac4dc06-43b7-40a9-839c-fe2f9466579e');

    } catch (error) {
        logger.error(`getAssetsDistribution error: ${error.message}`, {stack: error.stack});
        res.status(500).json({success: false, error: error.message});
    }
}
