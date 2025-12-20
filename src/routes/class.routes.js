const express = require("express");
const router = express.Router();

const classController = require('../controllers/class.controller');
const { authenticate, authorize, authorizeClassRole } = require('../middlewares/auth');
const sectionRoutes = require('./section.routes');
// POST /api/classes
router.post('/create', 
    authenticate, 
    authorize('Instructor'), 
    classController.createClass);

// GET /api/classes
router.get('/:userId', 
    authenticate, 
    classController.getClasses);
    
router.get('/:classId/class-code', 
    authenticate, 
    authorize('Instructor'),
    authorizeClassRole('admin'), 
    classController.getClassCode);

// /api/classes/:id/sections
router.use('/', sectionRoutes);

router.get('/:classId/search-users',
    authenticate,
    classController.searchUsers);

module.exports = router;
