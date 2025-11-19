const express = require('express');
const router = express.Router();
const leaderboardController = require('../../app/http/controllers/pre-launch/leaderboardController');

/**
 * GET /api/leaderboard/top-roi
 * Fetches the top 20 completed jobs ranked by numerical Return on Investment (ROI).
 */
router.get('/top-roi', leaderboardController.getTopRoiJobs);

module.exports = router;
