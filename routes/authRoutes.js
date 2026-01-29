const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const sendEmail = require("../utils/sendEmail");
const User = require("../models/User");
const protect = require("../middleware/authMiddleware");
const generateUserId = require("../utils/generateUserId");
const upload = require("../middleware/upload");
const generateToken = require("../utils/generateToken");
const fraudLogger = require("../utils/fraudLogger");

const router = express.Router();

/* =====================
   GET LOGGED USER
===================== */
router.get("/me", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "fullName email role profilePhoto userId dob mobile pan gender"
    );
    res.json(user);
  } catch {
    res.status(500).json({ msg: "Server error" });
  }
});

/* =====================
   SEND OTP (REGISTER)
===================== */
router.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email)
      return res.status(400).json({ msg: "Email required" });

    let user = await User.findOne({ email });

    if (user && user.isVerified) {
      return res.status(400).json({ msg: "User already exists" });
    }

    if (
      user?.otpLastSent &&
      Date.now() - user.otpLastSent < 60 * 1000
    ) {
      return res.status(429).json({
        msg: "Please wait before requesting OTP again"
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    if (!user) user = new User({ email });

    user.otp = otp;
    user.otpExpire = Date.now() + 5 * 60 * 1000;
    user.otpLastSent = Date.now();
    user.isVerified = false;
    user.otpAttempts = 0;

    await user.save();

    // 📧 EMAIL SEND (non-blocking)
    try {
      await sendEmail(
        email,
        "Your Earnaco OTP",
        `<h2>${otp}</h2><p>Valid for 5 minutes</p>`
      );
    } catch (mailErr) {
      console.error("EMAIL FAILED:", mailErr.message);
    }

    res.json({ msg: "OTP sent successfully" });
  } catch (err) {
    console.error("SEND OTP ERROR:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

const { OAuth2Client } = require("google-auth-library");
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post("/google-login", async (req, res) => {
  try {
    const { token } = req.body;

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        fullName: name,
        email,
        profilePhoto: picture,
        isVerified: true,
        role: "user",
        userId: generateUserId(),
        wallet: 0
      });
    }

    generateToken(res, {
      id: user._id,
      role: user.role,
      userId: user.userId
    });

    res.json({ msg: "Google login success", user });
  } catch (err) {
    console.error("GOOGLE LOGIN ERROR:", err);
    res.status(401).json({ msg: "Google authentication failed" });
  }
});


/* =====================
   VERIFY OTP & REGISTER
===================== */
router.post("/verify-otp-register", async (req, res) => {
  try {
    const { fullName, email, password, otp } = req.body;

    if (!fullName || !email || !password || !otp) {
      return res.status(400).json({ msg: "All fields required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ msg: "Invalid or expired OTP" });
    }

    // ⛔ OTP expired
    if (!user.otp || user.otpExpire < Date.now()) {
      return res.status(400).json({ msg: "OTP expired. Please resend OTP" });
    }

    // 🔐 OTP attempt limit
    user.otpAttempts = (user.otpAttempts || 0) + 1;

    if (user.otpAttempts > 5) {
      return res.status(403).json({
        msg: "Too many invalid attempts. Please resend OTP"
      });
    }

    // ❌ OTP mismatch
    if (user.otp !== otp) {
      await user.save();
      return res.status(400).json({ msg: "Invalid OTP" });
    }

    // ✅ OTP correct → register user
    const hashedPassword = await bcrypt.hash(password, 10);

    user.fullName = fullName;
    user.password = hashedPassword;
    user.userId = generateUserId();
    user.wallet = 0;
    user.role = "user";
    user.isVerified = true;

    // cleanup
    user.otp = undefined;
    user.otpExpire = undefined;
    user.otpAttempts = 0;

    await user.save();

    res.status(201).json({ msg: "Registered successfully" });
  } catch (err) {
    console.error("VERIFY OTP ERROR:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

/* =====================
   LOGIN
===================== */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const ip =
      req.headers["x-forwarded-for"] ||
      req.socket.remoteAddress;

    const device = req.headers["user-agent"];

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ msg: "Invalid credentials" });

    if (user.blocked)
      return res.status(403).json({ msg: "Account blocked" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      user.loginAttempts = (user.loginAttempts || 0) + 1;

      if (user.loginAttempts >= 5) {
        user.blocked = true;
        await fraudLogger(
          user._id,
          "Brute force login",
          "high",
          ip,
          device,
          "blocked"
        );
      }

      await user.save();
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    if (!user.isVerified)
      return res.status(403).json({ msg: "Please register first" });

    user.loginAttempts = 0;
    await user.save();

    generateToken(res, {
      id: user._id,
      role: user.role,
      userId: user.userId
    });

    res.json({ msg: "Login success", user });
  } catch {
    res.status(500).json({ msg: "Server error" });
  }
});

/* =====================
   FORGOT PASSWORD
===================== */
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.json({ msg: "If email exists, link sent" });

    const token = crypto.randomBytes(32).toString("hex");

    user.resetToken = token;
    user.resetExpire = Date.now() + 10 * 60 * 1000;
    await user.save();

    const link = `${process.env.CLIENT_URL}/reset/${token}`;

    await sendEmail(
      user.email,
      "Reset Password",
      `<a href="${link}">${link}</a>`
    );

    res.json({ msg: "Reset link sent" });
  } catch {
    res.status(500).json({ msg: "Server error" });
  }
});

/* =====================
   RESET PASSWORD
===================== */
router.post("/reset/:token", async (req, res) => {
  try {
    const user = await User.findOne({
      resetToken: req.params.token,
      resetExpire: { $gt: Date.now() }
    });

    if (!user)
      return res.status(400).json({ msg: "Invalid or expired link" });

    user.password = await bcrypt.hash(req.body.password, 10);
    user.resetToken = undefined;
    user.resetExpire = undefined;

    await user.save();

    res.json({ msg: "Password updated successfully" });
  } catch {
    res.status(500).json({ msg: "Server error" });
  }
});

/* =====================
   UPDATE PROFILE
===================== */
router.put(
  "/update-profile",
  protect,
  upload.single("profilePic"),
  async (req, res) => {
    try {
      const user = await User.findById(req.user.id);
      const { fullName, dob, mobile, pan, gender } = req.body;

      if (fullName) user.fullName = fullName;
      if (dob) user.dob = dob;
      if (mobile) user.mobile = mobile;
      if (pan) user.pan = pan;
      if (["male", "female", "other"].includes(gender))
        user.gender = gender;

      if (req.file) user.profilePhoto = req.file.path;

      await user.save();

      res.json({ msg: "Profile updated" });
    } catch {
      res.status(500).json({ msg: "Server error" });
    }
  }
);

/* =====================
   LOGOUT
===================== */
router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    domain: ".earnaco.com",
    secure: true,
    sameSite: "none"
  });

  res.json({ msg: "Logged out" });
});

module.exports = router;
