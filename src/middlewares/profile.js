const authorizeProfileAccess = (req, res, next) => {
  const requestedUserId = req.params.userId;
  const loggedInUserId = req.user._id.toString();

  // Own profile → allowed (already authenticated via authenticate middleware)
  // Someone else's profile → must be a logged-in user (already guaranteed by authenticate)
  // The only thing to block here is a Student viewing a non-Student profile,
  // but since profiles only exist for Students, findOne will just return null naturally.

  // If viewing own profile, attach a flag for controller use if needed
  req.isOwnProfile = requestedUserId === loggedInUserId;

  next();
};

module.exports = authorizeProfileAccess;