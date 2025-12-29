const express = require('express');
const router = express.Router();
const authenticate = require("../../app/http/middleware/auth");
const userController = require("../../app/http/controllers/userController");

// e.g. GET /api/users/list
router.get('/list', authenticate, userController.usersList);

// e.g. GET /api/users/{id}
router.get('/:id', authenticate, userController.userDetails);

// e.g. GET /api/users/role/change
router.get('/role/change', authenticate, userController.changeUserRole);

module.exports = router;
