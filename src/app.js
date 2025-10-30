/**
 * =================================================================
 * |                    THIS IS THE CORE EXPRESS APP               |
 * =================================================================
 * * This file, `app.js`, is responsible for creating and configuring
 * the Express application.
 * * Its main jobs are:
 * 1.  Creating the `app` instance from Express.
 * 2.  Applying all global middleware (like `cors`, `express.json`, `morgan`).
 * 3.  Connecting your main API router (from `src/routes/index.js`).
 * 4.  Setting up the global error handling.
 * * This file *does not* start the server. It only *exports* the configured
 * `app` object. The `server.js` file in your root folder is
 * responsible for importing this `app` and starting the server.
 * * This separation makes your app testable, as you can import `app`
 * into your test files without starting the server.
 */

// --- 1. IMPORT DEPENDENCIES ---
const express = require('express');
const cors = require('cors'); // Allows your frontend to make requests
const morgan = require('morgan'); // Logs HTTP requests in your console
const mainRouter = require('./routes/index'); // Your main API router
const globalErrorHandler = require('./middlewares/errorHandler');

// --- 2. CREATE EXPRESS APP ---
const app = express();
app.get('/favicon.ico', (req, res) => res.status(204).end());
// --- 3. SET UP MIDDLEWARE ---

// Enable Cross-Origin Resource Sharing (CORS)
// This is what lets your frontend (on a different domain) talk to this backend
app.use(cors());

// Parse incoming requests with JSON payloads (e.g., from a 'fetch' call)
app.use(express.json());

// Parse incoming requests with URL-encoded payloads (e.g., from an HTML form)
app.use(express.urlencoded({ extended: true }));

// Log HTTP requests (like 'GET /api/users 200 OK') to the console
app.use(morgan('dev'));

// --- 4. DEFINE API ROUTES ---

// A simple "health check" route to see if the server is running
app.get('/', (req, res) => {
  res.status(200).send('Welcome to the TEAMUP API!');
});

// Main API Routes
// All your other routes (auth, users, projects) are handled by mainRouter
// All API routes will be prefixed with /api
// Example: /api/auth/register
app.use('/api', mainRouter);

// --- 5. SET UP ERROR HANDLING ---

// 404 Not Found Handler
// This will catch any request that doesn't match a route in /api or '/'
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.status = 404;
  next(error); // Pass the error to the global error handler
});

// Global Error Handler
// This is your "catch-all" error middleware. Any 'next(error)' call will end up here.
// It MUST be the last 'app.use()' in the file.
app.use(globalErrorHandler);

// --- 6. EXPORT THE APP ---
// We export the app variable so server.js (your main file) can import it.
module.exports = app;