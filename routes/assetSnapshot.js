const express = require('express');
const authenticate     = require('../app/http/middleware/auth');
const assetSnapshotController    = require('../app/http/controllers/assetSnapshotController');
const router  = express.Router();

// GET /api/asset-snapshots
router.get('/asset-snapshots', authenticate, assetSnapshotController.listMySnapshots);

router.get('/overview', authenticate, assetSnapshotController.getAssetsOverview);

router.get('/today/full', authenticate, assetSnapshotController.getAssetsTodayFull);

module.exports = router;
