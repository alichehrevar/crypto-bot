// app/routes/orders.js

const express = require("express");
const router = express.Router();
const authenticate = require("../app/http/middleware/auth");
const orderController = require("../app/http/controllers/orderController");

// Place a manual market or limit order (with optional TP/SL)
router.post("/place", authenticate, orderController.placeOrder);

module.exports = router;
