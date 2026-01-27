const express = require("express");
const router = express.Router();

const classController = require("../controllers/class.controller");
const {
  authenticate,
  authorize,
  authorizeClassRole,
} = require("../middlewares/auth");
const sectionRoutes = require("./section.routes");
// POST /api/classes
router.post(
  "/create",
  authenticate,
  authorize("Instructor"),
  classController.createClass
);

router.post(
  "/:classId/invite",
  authenticate,
  authorize("Instructor"),
  authorizeClassRole("admin"),
  classController.inviteUser
);

// GET /api/classes
router.get("/:userId", authenticate, classController.getClasses);

router.get(
  "/:classId/class-code",
  authenticate,
  authorize("Instructor"),
  authorizeClassRole("admin"),
  classController.getClassCode
);

router.get(
  "/:classId/class-code",
  authenticate,
  authorize("Instructor"),
  authorizeClassRole("admin"),
  classController.getClassCode
);

router.patch(
  "/edit/:classId",
  authenticate,
  authorize("Instructor"),
  authorizeClassRole("admin"),
  classController.editClass
);

router.delete(
  "/delete/:classId",
  authenticate,
  authorize("Instructor"),
  authorizeClassRole("admin"),
  classController.deleteClass
);

router.post("/join", authenticate, classController.joinClassByCode);

router.patch(
  "/invitations/:invitationId",
  authenticate,
  classController.respondToInvitation
);

router.get(
  "/:classId/count-members",
  authenticate,
  classController.getClassMemberCount
);

// /api/classes/:id/sections
router.use("/", sectionRoutes);

router.get("/:classId/search-users", authenticate, classController.searchUsers);

module.exports = router;
