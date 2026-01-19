const express = require("express");
const protect = require("../middleware/authMiddleware");
const User = require("../models/User");
const upload = require("../middleware/upload");
const router = express.Router();

router.get("/referral", protect, async (req, res) => {
  const user = await User.findById(req.user.id);
  res.json({ referralCode: user.referralCode });
});

/**
 * GET LOGGED-IN USER PROFILE
 */
router.get("/me", protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user).select("-password");
    res.json(user);
  } catch (err) {
  next(err);
}

});

/**
 * UPDATE USER PROFILE
 */
router.put(
  "/photo",
  protect,
  upload.single("photo"),
  async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id);

      user.profilePhoto = `/uploads/profiles/${req.file.filename}`;
      await user.save();

      res.json({
        msg: "Profile photo updated",
        photo: user.profilePhoto
      });
    } catch (err) {
  next(err);
}

  }
);
router.put("/me", protect, async (req, res, next) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.user,
      {
        fullName: req.body.fullName,
        dob: req.body.dob,
        gender: req.body.gender,
        phone: req.body.phone,
        profilePhoto: req.body.profilePhoto
      },
      { new: true }
    ).select("-password");

    res.json({
      msg: "Profile updated successfully",
      user: updatedUser
    });
  } catch (err) {
  next(err);
}

});

module.exports = router;
