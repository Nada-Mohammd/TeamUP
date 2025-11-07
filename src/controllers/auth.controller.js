const User = require('../models/User'); 
const jwt = require('jsonwebtoken');
const DEFAULT_SECRET = 'aWf1@G7hJkL2$mN3%oP4^qR5&sT6*uV7(wX8)yZ9~A0bCdE!fGhIjKlMnOpQrStUvWxYz';

const createSendToken = (user, statusCode, req, res, rememberMe) => {
    const secret = process.env.JWT_SECRET || DEFAULT_SECRET;
    const expiresIn = rememberMe ? '30d' : '1h'; // 30 days vs 1 hour

    //Sign the token
    const token = jwt.sign({ id: user._id }, secret, {
        expiresIn: expiresIn,
    });

    // Set cookie options based on rememberMe flag
    const cookieOptions = {
        // Set cookie expiration time
        expires: rememberMe
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
            : new Date(Date.now() + 60 * 60 * 1000),         // 1 hour
        
    };

    // Send the cookie and response
    res.cookie('jwt', token, cookieOptions);

    // Remove password from output before sending response
    user.password = undefined;

    res.status(statusCode).json({
        status: 'success',
        token,
        data: { user },
    });
};

// POST /api/auth/login
const login = async (req, res, next) => {
    try {
      console.log('\n--- NEW LOGIN ATTEMPT ---');
        console.log('Email received from Postman:', req.body.email);
        const { email, password, rememberMe } = req.body; // 'rememberMe' is a boolean flag
        if (!email || !password) {
            return res.status(400).json({
                status: 'fail',
                message: 'Please provide email and password.',
            });
        }
      
        const user = await User.findOne({ email }).select('+password');
        if (!user ) {
            return res.status(401).json({
                status: 'fail',
                message: 'Invalid email ',
            });
        }
        if ( !(await user.comparePassword(password))) {
            return res.status(401).json({
                status: 'fail',
                message: 'Invalid password ',
            });
        }
        createSendToken(user, 200, req, res, rememberMe);

    } catch (error) {
        next(error);
    }
};
module.exports = {
    login,
};