const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'courseworks',
    resource_type: 'auto',
    access_mode: 'public',
    upload_preset: 'courseworks_preset', 
    allowed_formats: ['pdf', 'doc', 'docx', 'jpg', 'png', 'jpeg'],
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, 
  },
});

module.exports = upload;



