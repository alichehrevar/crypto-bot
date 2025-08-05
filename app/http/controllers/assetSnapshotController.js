/**
 * @file Controller for handling asset snapshot related API requests.
 */
const AssetSnapshot = require('../../models/AssetSnapshot');

/**
 * @description Lists the last 30 days of snapshots for the authenticated user,
 * formatted for use in a chart.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 */
exports.listMySnapshots = async (req, res) => {
    try {
        const userId = req.user.id;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const snapshots = await AssetSnapshot
            .find({
                userId,
                timestamp: { $gte: thirtyDaysAgo }
            })
            .sort({ timestamp: 'asc' }) // Sort ascending for a proper time-series chart
            .lean();

        // Format the data into the structure the frontend chart component expects
        const formattedData = snapshots.map(snap => ({
            date: new Date(snap.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            value: snap.total
        }));

        return res.json({ success: true, data: formattedData });
    } catch (err) {
        console.error('assetSnapshotController.listMySnapshots error', err);
        return res.status(500).json({ success: false, error: 'Failed to retrieve asset history' });
    }
};
