const express = require("express");
const protect = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");
const User = require("../models/User");

const router = express.Router();

/* =========================
   GET LOGGED-IN USER
========================= */
router.get("/me", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ msg: "User not found" });
    res.json(user);
  } catch (err) {
    console.error("GET ME ERROR:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

/* =========================
   GET REFERRAL CODE
========================= */
router.get("/referral", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("referralCode");
    res.json({ referralCode: user.referralCode });
  } catch (err) {
    console.error("REFERRAL ERROR:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

/* =========================
   UPDATE PROFILE DETAILS
========================= */
router.put("/me", protect, async (req, res) => {
  try {
    const { fullName, dob, gender, phone } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    if (fullName) user.fullName = fullName;
    if (dob) user.dob = dob;
    if (phone) user.phone = phone;
    if (["male", "female", "other"].includes(gender))
      user.gender = gender;

    await user.save();

    res.json({
      msg: "Profile updated successfully",
      user
    });
  } catch (err) {
    console.error("UPDATE PROFILE ERROR:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

/* =========================
   UPDATE PROFILE PHOTO
========================= */
router.put(
  "/photo",
  protect,
  upload.single("photo"),
  async (req, res) => {
    try {
      if (!req.file)
        return res.status(400).json({ msg: "No file uploaded" });

      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ msg: "User not found" });

      user.profilePhoto = req.file.path; // dynamic & safe
      await user.save();

      res.json({
        msg: "Profile photo updated",
        photo: user.profilePhoto
      });
    } catch (err) {
      console.error("PHOTO UPLOAD ERROR:", err);
      res.status(500).json({ msg: "Server error" });
    }
  }
);

module.exports = router;
