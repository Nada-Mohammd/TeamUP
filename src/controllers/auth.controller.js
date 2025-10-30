/**
 * =================================================================
 * |                     AUTH CONTROLLER                           |
 * =================================================================
 * * This file holds the "business logic" for authentication.
 * * The functions here are called by the auth.routes.js file.
 */

// This is an empty function just to make the server run.
// It will be called when you send a POST request to /api/auth/register
const register = async (req, res, next) => {
  try {
    // We are not adding any logic yet.
    // We just send a success message to show it's working.
    console.log('Received data in register controller:', req.body);

    res.status(201).json({ 
      message: 'Register route is working! User would be created here.' 
    });

  } catch (error) {
    // Pass any errors to the global error handler
    next(error);
  }
};

// We must export the function so the router can import it
module.exports = {
  register,
  // login, // We will add this later
};