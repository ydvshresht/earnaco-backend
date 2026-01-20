const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const sendEmail = require("../utils/sendEmail");
const User = require("../models/User");
const protect = require("../middleware/authMiddleware");
const generateUserId = require("../utils/generateUserId");
const upload = require("../middleware/upload");
const { registerSchema } = require("../utils/validators");

const router = express.Router();

/* =====================
   GET LOGGED USER
===================== */
router.get("/me", protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select(
      "fullName email role profilePhoto userId dob mobile pan gender isVerified"
    );
    res.json(user);
  } catch (err) {
    next(err);
  }
});

/* =====================
   REGISTER
===================== */
router.post("/register", async (req, res, next) => {
 try {
  const { error } = registerSchema.validate(req.body);
  if (error)
    return res.status(400).json({ msg: error.details[0].message });

  const { fullName, email, password } = req.body;

  const userExists = await User.findOne({ email });
  if (userExists)
    return res.status(400).json({ msg: "User already exists" });

  const hashedPassword = await bcrypt.hash(password, 10);
  const emailToken = crypto.randomBytes(32).toString("hex");

  await User.create({
    fullName,
    email,
    password: hashedPassword,
    userId: generateUserId(),
    wallet: 0,
    role: "user",
    isVerified: false,
    emailToken,
    emailTokenExpire: Date.now() + 10 * 60 * 1000
  });

  const verifyLink = `https://earnaco.com/verify/${emailToken}`;


  // 🔥 DO NOT FAIL REGISTRATION IF EMAIL FAILS
  try {
    await sendEmail(
      email,
      "Verify your email",
      `<a href="${verifyLink}">${verifyLink}</a>`
    );
  } catch (mailErr) {
    console.log("EMAIL FAILED BUT USER CREATED", mailErr);
  }

  res.status(201).json({
    msg: "Registered successfully! Please verify email"
  });

 } catch (err) {
  next(err);
 }
});


/* =====================
   LOGIN (FRAUD SAFE)
===================== */

const generateToken = require("../utils/generateToken");

const fraudLogger = require("../utils/fraudLogger");

router.post("/login", async (req,res,next)=>{
 try{
  const { email,password } = req.body;

  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  const device = req.headers["user-agent"];

  const user = await User.findOne({email});
  if(!user) return res.status(400).json({msg:"Invalid credentials"});

  if(user.blocked)
   return res.status(403).json({msg:"Account blocked"});

  const match = await bcrypt.compare(password,user.password);

  if(!match){
   user.loginAttempts++;

   if(user.loginAttempts>=5){
    user.blocked=true;

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
   return res.status(400).json({msg:"Invalid credentials"});
  }

  user.loginAttempts=0;
  await user.save();

  if(!user.isVerified)
   return res.status(403).json({msg:"Verify email first"});

  generateToken(res,{
   id:user._id,
   role:user.role,
   userId:user.userId
  });

  res.json({msg:"Login success",user});

 }catch(err){next(err);}
});



/* =====================
   EMAIL VERIFY
===================== */
router.get("/verify/:token", async (req, res, next) => {
  try {
    const user = await User.findOne({
      emailToken: req.params.token,
      emailTokenExpire: { $gt: Date.now() }
    });

    if (!user)
      return res.status(400).json({
        msg: "Invalid or expired link"
      });

    user.isVerified = true;
    user.emailToken = undefined;
    user.emailTokenExpire = undefined;
    await user.save();

    res.json({ msg: "Email verified successfully" });

  } catch (err) {
    next(err);
  }
});

/* =====================
   RESEND EMAIL
===================== */
router.post("/resend", async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email)
      return res.status(400).json({ msg: "Email required" });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ msg: "User not found" });

    if (user.isVerified)
      return res.json({ msg: "Email already verified" });

    const emailToken = crypto.randomBytes(32).toString("hex");

    user.emailToken = emailToken;
    user.emailTokenExpire = Date.now() + 10 * 60 * 1000;
    await user.save();

   const link = `https://earnaco.com/verify/${emailToken}`;


    await sendEmail(
      user.email,
      "Verify your email",
      `
      <h2>Email Verification</h2>
      <p>Click below:</p>
      <a href="${link}">${link}</a>
      `
    );

    res.json({ msg: "Verification email sent again" });

  } catch (err) {
    next(err);
  }
});

/* =====================
   FORGOT PASSWORD
===================== */
router.post("/forgot-password", async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ msg: "If email exists, reset link sent" });
    }

    const token = crypto.randomBytes(32).toString("hex");

    user.resetToken = token;
    user.resetExpire = Date.now() + 10 * 60 * 1000;
    await user.save();

    const link = `${process.env.CLIENT_URL}/reset/${token}`;

    await sendEmail(
      user.email,
      "Reset Password",
      `
      <h2>Password Reset</h2>
      <p>Click below:</p>
      <a href="${link}">${link}</a>
      `
    );

    res.json({ msg: "Reset link sent to email" });

  } catch (err) {
    next(err);
  }
});

/* =====================
   RESET PASSWORD
===================== */
router.post("/reset/:token", async (req, res, next) => {
  try {
    const user = await User.findOne({
      resetToken: req.params.token,
      resetExpire: { $gt: Date.now() }
    });

    if (!user)
      return res.status(400).json({ msg: "Invalid or expired link" });

    const hashed = await bcrypt.hash(req.body.password, 10);

    user.password = hashed;
    user.resetToken = undefined;
    user.resetExpire = undefined;

    await user.save();

    res.json({ msg: "Password updated successfully" });

  } catch (err) {
    next(err);
  }
});

/* =====================
   UPDATE PROFILE
===================== */
router.put(
  "/update-profile",
  protect,
  upload.single("profilePic"),
  async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id);

      if (req.file && user.profilePhoto) {
        const oldPath = path.join(__dirname, "..", user.profilePhoto);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }

      const { fullName, dob, mobile, pan, gender } = req.body;

      if (fullName) user.fullName = fullName;
      if (dob) user.dob = dob;
      if (mobile) user.mobile = mobile;
      if (pan) user.pan = pan;
      if (["male", "female", "other"].includes(gender))
        user.gender = gender;

      if (req.file)
        user.profilePhoto = `/uploads/profiles/${req.file.filename}`;

      await user.save();

      res.json({
        msg: "Profile updated successfully",
        profilePhoto: user.profilePhoto
      });

    } catch (err) {
      next(err);
    }
  }
);
// LOGOUT
router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    domain: ".earnaco.com",
    secure: true,
    sameSite: "none"
  });

  res.json({ msg: "Logged out" });
});


module.exports = router;
