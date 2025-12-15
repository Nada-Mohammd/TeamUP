const express = require("express");
const router = express.Router();

const classController = require('../controllers/class.controller');
const { protect } = require('../middlewares/auth'); // Middleware to check logged-in user

// POST /api/classes
router.post('/create', protect, classController.createClass);

module.exports = router;
