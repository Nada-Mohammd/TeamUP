const express = require("express");
const router = express.Router();

const classController = require('../controllers/class.controller');
const { authenticate, authorize, checkClassRole } = require('../middlewares/auth');

// POST /api/classes
router.post('/create', 
    authenticate, 
    authorize('Instructor'), 
    classController.createClass);

// GET /api/classes
router.get('/:classId/class-code', 
    authenticate, 
    authorize('Instructor'), 
    checkClassRole('admin'), 
    classController.getClassCode);

module.exports = router;
