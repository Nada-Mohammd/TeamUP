const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: "courseworks",
    resource_type: "raw",
    use_filename: true,
    unique_filename: false,
    public_id: file.originalname, // keeps extension

    access_mode: "public",
  }),
});

const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024,
  },
});

const profileStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    if (file.fieldname === "profile_picture") {
      return {
        folder: "profile_pictures",
        resource_type: "image",
        use_filename: true,
        unique_filename: false,
        access_mode: "public",
      };
    }

    if (file.fieldname === "cv") {
      const ext = file.originalname.split(".").pop();

      const baseName = file.originalname
        .replace(/\.[^/.]+$/, "")
        .replace(/\s+/g, "_")
        .replace(/[()]/g, "");

      return {
        folder: "cvs",
        resource_type: "raw",
        use_filename: false,
        unique_filename: false,
        public_id: `${baseName}_${Date.now()}.${ext}`,
        access_mode: "public",
      };
    }
  },
});

// ── Profile (profile picture + CV) ────────────────────────────────────────
const uploadProfileFiles = multer({
  storage: profileStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (
      file.fieldname === "profile_picture" &&
      !file.mimetype.startsWith("image/")
    ) {
      return cb(new Error("Profile picture must be an image."));
    }
    if (file.fieldname === "cv") {
      const allowed = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];
      if (!allowed.includes(file.mimetype)) {
        return cb(new Error("CV must be a PDF or Word document."));
      }
    }
    cb(null, true);
  },
}).fields([
  { name: "profile_picture", maxCount: 1 },
  { name: "cv", maxCount: 1 },
]);

module.exports = { upload, uploadProfileFiles };
