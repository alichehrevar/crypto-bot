const AssetSnapshot = require('../../models/AssetSnapshot');

exports.listMySnapshots = async (req, res) => {
    try {
        const userId = req.user.id;
        const snaps  = await AssetSnapshot
            .find({ userId })
            .sort({ timestamp: -1 })
            .lean();

        return res.json({ success: true, snapshots: snaps });
    } catch (err) {
        console.error('assetSnapshotController.listMySnapshots error', err);
        return res.status(500).json({ success: false, error: err.message });
    }
};
