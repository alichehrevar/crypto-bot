/**
 * @file Controller for handling asset snapshot related API validators.
 */
const AssetSnapshotService = require('../../services/AssetSnapshotService');

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
        console.error('assetSnapshotController.listMySnapshots error', err);
        return res.status(500).json({ success: false, error: 'Failed to retrieve asset history' });
    }
};
