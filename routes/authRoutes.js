const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const sendEmail = require("../utils/sendEmail");
const User = require("../models/User");
const CoinTransaction = require("../models/CoinTransaction");

const protect = require("../middleware/authMiddleware");
const generateUserId = require("../utils/generateUserId");
const upload = require("../middleware/upload");
const generateToken = require("../utils/generateToken");

const { OAuth2Client } = require("google-auth-library");

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/* =====================
   GET LOGGED USER
===================== */
router.get("/me", protect, async (req, res) => {
  const user = await User.findById(req.user.id).select(
    "fullName email role profilePhoto userId coins referralCode"
  );
  res.json(user);
});

/* =====================
   APPLY REFERRAL
===================== */
router.post("/apply-referral", protect, async (req, res) => {
  const { code } = req.body;
  const user = await User.findById(req.user.id);

  if (user.referralRewarded)
    return res.status(400).json({ msg: "Referral already used" });

  const referrer = await User.findOne({ referralCode: code });

  if (!referrer || referrer._id.equals(user._id))
    return res.status(400).json({ msg: "Invalid referral code" });

  // 🪙 reward both
  user.coins += 1;
  referrer.coins += 1;

  user.referredBy = code;
  user.referralRewarded = true;

  await user.save();
  await referrer.save();

  await CoinTransaction.create([
    { user: user._id, coins: 1, type: "credit", reason: "Referral bonus" },
    { user: referrer._id, coins: 1, type: "credit", reason: "Referral reward" }
  ]);

  res.json({ msg: "Referral applied. +1 coin added 🎉" });
});

/* =====================
   SEND OTP
===================== */
router.post("/send-otp", async (req, res) => {
  const { email } = req.body;

  let user = await User.findOne({ email });

  if (user?.isVerified)
    return res.status(400).json({ msg: "User already exists" });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  if (!user) user = new User({ email });

  user.otp = otp;
  user.otpExpire = Date.now() + 5 * 60 * 1000;

  await user.save();

  await sendEmail(email, "Earnaco OTP", `<h2>${otp}</h2>`);

  res.json({ msg: "OTP sent" });
});

/* =====================
   VERIFY OTP & REGISTER
===================== */
router.post("/verify-otp-register", async (req, res) => {
  const { fullName, email, password, otp } = req.body;

  const user = await User.findOne({ email, otp });

  if (!user)
    return res.status(400).json({ msg: "Invalid OTP" });

  if (user.otpExpire < Date.now())
    return res.status(400).json({ msg: "OTP expired" });

  if (user.isVerified)
    return res.status(400).json({ msg: "User already registered" });

  user.fullName = fullName;
  user.password = await bcrypt.hash(password, 10);
  user.userId = generateUserId();
  user.referralCode = user.userId;
  user.isVerified = true;

  // 🪙 GIVE BONUS ONLY ONCE
  if (!user.coins || user.coins === 0) {
    user.coins = 5;

    await CoinTransaction.create({
      user: user._id,
      coins: 5,
      type: "credit",
      reason: "Signup bonus"
    });
  }

  user.otp = undefined;
  user.otpExpire = undefined;

  await user.save();

  res.json({ msg: "Registered successfully" });
});

/* =====================
   EMAIL + PASSWORD LOGIN
===================== */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user || !user.password) {
    return res.status(400).json({ msg: "Invalid email or password" });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(400).json({ msg: "Invalid email or password" });
  }

  if (!user.isVerified) {
    return res.status(400).json({ msg: "Account not verified" });
  }

  generateToken(res, { id: user._id });

  res.json({
    msg: "Login successful",
    user: {
      id: user._id,
      email: user.email,
      role: user.role
    }
  });
});

/* =====================
   GOOGLE LOGIN / SIGNUP
===================== */
router.post("/google-login", async (req, res) => {
  const { token, referralCode } = req.body;

  const ticket = await googleClient.verifyIdToken({
    idToken: token,
    audience: process.env.GOOGLE_CLIENT_ID
  });

  const { email, name, picture } = ticket.getPayload();

  let user = await User.findOne({ email });
  let isNewUser = false;

  if (!user) {
    user = await User.create({
  fullName: name,
  email,
  profilePhoto: picture,
  isVerified: true,
  googleAuth: true,     // 🔥 IMPORTANT
  userId: generateUserId(),
  referralCode: generateUserId(),
  coins: 5
});


    await CoinTransaction.create({
      user: user._id,
      coins: 5,
      type: "credit",
      reason: "Google signup bonus"
    });

    isNewUser = true;
  }

  generateToken(res, { id: user._id });

  res.json({
    msg: isNewUser ? "Google signup success" : "Google login success",
    user,
    isNewUser
  });
});

/* =====================
   WATCH AD → +1 COIN
===================== */
router.post("/watch-ad", protect, async (req, res) => {
  const user = await User.findById(req.user.id);

  user.coins += 1;
  await user.save();

  await CoinTransaction.create({
    user: user._id,
    coins: 1,
    type: "credit",
    reason: "Watched ad"
  });

  res.json({ msg: "+1 coin added" });
});

module.exports = router;
