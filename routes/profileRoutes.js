const express = require("express");
const protect = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");
const User = require("../models/User");
const fs = require("fs");
const path = require("path");

const router = express.Router();

/* ===============================
   GET LOGGED USER
=============================== */
router.get("/me", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user)
      return res.status(404).json({ msg: "User not found" });

    res.json(user);
  } catch (err) {
    console.error("GET PROFILE ERROR:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

/* ===============================
   UPDATE PROFILE DATA
=============================== */
router.put("/me", protect, async (req, res) => {
  try {
    const { fullName, dob, gender, mobile } = req.body;

    const user = await User.findById(req.user.id);
    if (!user)
      return res.status(404).json({ msg: "User not found" });

    if (fullName) user.fullName = fullName;
    if (dob) user.dob = dob;
    if (mobile) user.mobile = mobile;
    if (["male", "female", "other"].includes(gender))
      user.gender = gender;

    await user.save();
    res.json({ msg: "Profile updated", user });
  } catch (err) {
    console.error("UPDATE PROFILE ERROR:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

/* ===============================
   UPDATE PROFILE PHOTO
=============================== */
router.put(
  "/photo",
  protect,
  upload.single("photo"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ msg: "No file uploaded" });
      }

      // validate image type
      if (!req.file.mimetype.startsWith("image/")) {
        return res
          .status(400)
          .json({ msg: "Only images allowed" });
      }

      const user = await User.findById(req.user.id);
      if (!user)
        return res.status(404).json({ msg: "User not found" });

      // delete old photo if exists
      if (user.profilePhoto) {
        const oldPath = path.join(
          __dirname,
          "..",
          user.profilePhoto
        );
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      user.profilePhoto = `/uploads/${req.file.filename}`;
      await user.save();

      res.json({
        msg: "Photo updated",
        photo: user.profilePhoto
      });
    } catch (err) {
      console.error("UPLOAD PHOTO ERROR:", err);
      res.status(500).json({ msg: "Server error" });
    }
  }
);

module.exports = router;
