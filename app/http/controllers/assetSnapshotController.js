const AssetSnapshot = require('../../models/AssetSnapshot');
const AssetSnapshotService = require('../../services/AssetSnapshotService');
const logger = require('../../../logs/logger');

/**
 * @description Lists the last 7 days of snapshots for the authenticated user by calling the service.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 */
exports.listMySnapshots = async (req, res) => {
    try {
        const userId = req.user.id;

        // Call the service to get the raw snapshot data.
        const snapshots = await AssetSnapshotService.getRecentSnapshotsForUser(userId);

        // Format the data specifically for the API response.
        const formattedData = snapshots.map(snap => ({
            date: new Date(snap.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            total: snap.total,
            balances: snap.balances
        }));

        return res.json({ success: true, data: formattedData });
    } catch (err) {
        logger.error('assetSnapshotController.listMySnapshots error', err);
        console.error('assetSnapshotController.listMySnapshots error', err);
        return res.status(500).json({ success: false, error: 'Failed to retrieve asset history' });
    }
};

/**
 * Get Asset Overview
 * GET /api/assets/overview
 */
exports.getAssetOverview = async (req, res, next) => {
    try {
        const userId = req.user.id; // Assuming auth middleware adds user to req
        const { view } = req.query;

        // Basic validation
        if (view !== 'broker' && view !== 'asset') {
            return res.status(400).json({ message: 'Invalid view type. Must be "broker" or "asset".' });
        }

        const data = await AssetSnapshotService.getAssetOverview(userId, view);

        res.json(data);

    } catch (error) {
        logger.error(`Error in getAssetOverview: ${error.message}`, { userId: req.user.id, view });
        next(error);
    }
};

exports.getAssetsOverview = async (req, res) => {
    try {
        const userId = req.user.id;
        const today = new Date(); today.setUTCHours(0,0,0,0);

        const snap = await AssetSnapshot.findOne({ userId, timestamp: today })
            .select('brokerTree assetTree')
            .lean();

        if (!snap || !snap.brokerTree || !snap.assetTree) {
            return res.status(404).json({ error: 'No snapshot trees for today yet.', success: false });
        }

        res.json({ data: {broker: snap.brokerTree, asset: snap.assetTree}, success: true });
    } catch (e) {
        logger.error('[getAssetsOverview] ', e);
        console.error('[getAssetsOverview] ', e);
        res.status(500).json({ error: 'Failed to load assets overview', success: false });
    }
};

exports.getAssetsTodayFull = async (req, res) => {
    try {
        const userId = req.user.id;
        const today = new Date(); today.setUTCHours(0,0,0,0);

        const snap = await AssetSnapshot.findOne({ userId, timestamp: today })
            .select('balances total brokerTree assetTree details meta')
            .lean();

        if (!snap) return res.status(404).json({ message: 'No snapshot for today yet.', success: false });

        res.json({data: snap, success: true});
    } catch (e) {
        logger.error('[getAssetsTodayFull]', e);
        console.error('[getAssetsTodayFull]', e);
        res.status(500).json({ message: 'Failed to load full assets snapshot', success: false });
    }
};
