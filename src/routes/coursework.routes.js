const express = require('express');
const router = express.Router();

const courseworkController = require('../controllers/coursework.controller');
const upload = require('../middlewares/upload');
const {
  authenticate,
  authorize,
  authorizeClassRole,
} = require("../middlewares/auth");

router.post(
  "/create",
   authenticate,
   authorize('Instructor'),
   authorizeClassRole("admin"),
    upload.array('files', 5), 
    courseworkController.createCoursework
);


module.exports = router;
