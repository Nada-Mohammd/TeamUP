const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

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

module.exports = upload;