const express = require('express');
const router = express.Router();
const dcaBotController = require('../../app/http/controllers/dcaBotController');
const authenticate = require('../../app/http/middleware/auth');

router.post('/', authenticate, dcaBotController.createDcaBot);
router.get('/', authenticate, dcaBotController.getDcaBots);
router.patch('/:id/enable', authenticate, dcaBotController.enableDcaBot);
router.patch('/:id/disable', authenticate, dcaBotController.disableDcaBot);

module.exports = router;
