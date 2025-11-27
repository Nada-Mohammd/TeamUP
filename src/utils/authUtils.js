const createSendToken = (user, statusCode, req, res, rememberMe) => {
  const secret = process.env.JWT_SECRET || process.env.DEFAULT_SECRET;
  const expiresIn = rememberMe ? "30d" : "1h"; // 30 days vs 1 hour

  //Sign the token
  const token = jwt.sign({ id: user._id }, secret, {
    expiresIn: expiresIn,
  });

  // Set cookie options based on rememberMe flag
  const cookieOptions = {
    // Set cookie expiration time
    expires: rememberMe
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      : new Date(Date.now() + 60 * 60 * 1000), // 1 hour
  };

  // Send the cookie and response
  res.cookie("jwt", token, cookieOptions);

  // Remove password from output before sending response
  user.password = undefined;

  res.status(statusCode).json({
    status: "success",
    token,
    data: { user },
  });
};
module.exports = {
  createSendToken,
};
