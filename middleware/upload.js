const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "earnaco/profiles",
   allowed_formats: ["jpg", "jpeg", "png", "webp", "heic", "heif"]

  }
});

const fileFilter = (_, file, cb) => {
  if (
    file.mimetype.startsWith("image/") ||
    ["image/heic", "image/heif"].includes(file.mimetype)
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only images allowed"));
  }
};


module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB mobile safe
});
