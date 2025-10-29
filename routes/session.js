const express = require('express');
const router = express.Router();
const authenticate = require('../app/http/middleware/auth');

router.get('/', authenticate, (req, res) => {
    return res.json({
        success: true,
        data: { userId: req.user.id, role: req.user.role }
    });
});

module.exports = router;
