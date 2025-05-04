// routes/market.js
const express = require('express')
const router = express.Router()
const marketController = require('../app/http/controllers/marketController')

router.get('/top-movers', marketController.getTopMovers)

module.exports = router
