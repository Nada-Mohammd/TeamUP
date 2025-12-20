const jwt = require("jsonwebtoken");
const User = require("../models/User");
const ClassProfile = require("../models/ClassProfile");

//authentication
const authenticate = async (req, res, next) => {
  try {
    let token;

    
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
    } 
    else if (req.cookies?.jwt) {
      token = req.cookies.jwt;
    }
    
    if (!token) {
      return res.status(401).json({
        status: "fail",
        message: "You are not logged in. Token missing.",
      });
    }

    const secret = process.env.JWT_SECRET || process.env.DEFAULT_SECRET;
    const decoded = jwt.verify(token, secret);
 

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        status: "fail",
        message: "The user belonging to this token no longer exists.",
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      status: "fail",
      message: "Invalid or expired token.",
    });
  }
};

//authorization
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: "You do not have permission to perform this action",
      });
    }

    next();
  };
};

// authorize class role (admin/member)
const authorizeClassRole = (requiredRole) => {
  return async (req, res, next) => {
    try {
      const { classId } = req.params;
      const userId = req.user.id;

      const membership = await ClassProfile.findOne({ classId, userId });

      if (!membership) {
        return res.status(403).json({ message: 'You are not a member of this class' });
      }

      if (membership.classRole !== requiredRole) {
        return res.status(403).json({ message: `Only ${requiredRole}s can perform this action` });
      }

      next();
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  };
};

module.exports = {
  authenticate,
  authorize,
  authorizeClassRole,
};