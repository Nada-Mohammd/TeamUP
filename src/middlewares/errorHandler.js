/**
 * =================================================================
 * |                     GLOBAL ERROR HANDLER                      |
 * =================================================================
 * * This is a special piece of Express middleware that catches
 * * all errors thrown in your application.
 * * It must be the LAST 'app.use()' call in app.js.
 * *
 * * By using 'next(error)' in your controllers, the error
 * * automatically gets sent here to be handled.
 */

const errorHandler = (err, req, res, next) => {
  // Log the error to the console for debugging
  // In production, you would log to a file or error-tracking service
  console.error(err.stack);

  // Determine the status code
  // If the error object has a statusCode, use it. Otherwise, default to 500 (Internal Server Error)
  const statusCode = err.statusCode || 500;

  // Send a clean, standardized error response to the client
  res.status(statusCode).json({
    message: err.message || 'An unexpected error occurred on the server.',
    // In development mode, you can send the stack trace for debugging
    // In production, you would not send the stack.
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
  });
};

module.exports = errorHandler;