const express = require("express");
const router = express.Router();

const courseworkController = require("../controllers/coursework.controller");
const upload = require("../middlewares/upload");
const {
  authenticate,
  authorize,
  authorizeClassRole,
} = require("../middlewares/auth");

router.post(
  "/create/:classId",
  authenticate,
  authorize("Instructor"),
  authorizeClassRole("admin"),
  upload.array("files", 5),
  courseworkController.createCoursework,
);

router.get(
  "/:courseworkId",
  authenticate,
  courseworkController.getCourseworkById,
);

router.get(
  "/:courseworkId/available-students/:teamId",
  authenticate,
  authorizeClassRole("member"),
  courseworkController.getAvailableStudents,
);

router.patch(
  "/update/:courseworkId",
  authenticate,
  authorize("Instructor"),
  upload.array("files", 5),
  courseworkController.updateCoursework,
);

router.delete(
  "/delete/:courseworkId",
  authenticate,
  authorize("Instructor"),
  courseworkController.deleteCoursework,
);

module.exports = router;
