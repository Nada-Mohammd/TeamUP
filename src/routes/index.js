/**
 * =================================================================
 * |                     MAIN API ROUTER (HUB)                     |
 * =================================================================
 * * This file is the main "switchboard" for all API routes.
 * * It imports all "feature" routers and mounts them on a path.
 * *
 * * We will COMMENT OUT all the routes that are not ready
 * * to prevent the server from crashing.
 */

const express = require('express');
const router = express.Router();

// 1. Import all your feature routers
const authRoutes = require('./auth.routes');
// const workspaceRoutes = require('./workspace.routes');
// const teamRoutes = require('./team.routes');
// const projectRoutes = require('./project.routes');
// const taskRoutes = require('./task.routes');

// 2. Mount them on their base paths
router.use('/auth', authRoutes); 

// --- COMMENTED OUT ---
// router.use('/workspaces', workspaceRoutes);
// router.use('/teams', teamRoutes);
// router.use('/projects', projectRoutes);
// router.use('/tasks', taskRoutes);
// --- END COMMENTED OUT ---

// Export the main router to be used in app.js
module.exports = router;