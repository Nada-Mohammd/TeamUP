/**
 * =================================================================
 * |                     AUTH ROUTES                               |
 * =================================================================
 * * This file defines the API endpoints for authentication.
 * * (e.g., /api/auth/register, /api/auth/login)
 * * It connects these routes to the controller functions.
 */

const express = require('express');
const router = express.Router();
const { register } = require('../controllers/auth.controller');
const { login } = require('../controllers/auth.controller'); 


//router.post('/register', register);
router.post('/login', login);

module.exports = router;