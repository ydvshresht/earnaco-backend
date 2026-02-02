const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true
    },

    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local"
    },

    password: {
      type: String,
      required: function () {
        return this.authProvider === "local";
      }
    },

    signupBonusGiven: {
      type: Boolean,
      default: false
    },

    pan: {
      type: String,
      uppercase: true,
      index: true
    },

    dob: Date,

    gender: {
      type: String,
      enum: ["male", "female", "other"],
      lowercase: true
    },

    mobile: {
      type: String
    },

    profilePhoto: {
      type: String,
      default: ""
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user"
    },

    coins: {
      type: Number,
      default: 0
    },

    lastAdWatchedAt: {
      type: Date,
      default: null
    },

    userId: {
      type: String,
      unique: true,
      required: true,
      index: true
    },

    ip: String,
    deviceId: String,

    blocked: {
      type: Boolean,
      default: false
    },

    blockedReason: String,

    loginAttempts: {
      type: Number,
      default: 0
    },

    lockUntil: Date,

    otp: String,
    otpExpire: Date,
    otpLastSent: Date,
    otpAttempts: { type: Number, default: 0 },

    isVerified: {
      type: Boolean,
      default: false
    },

    referralCode: {
      type: String,
      unique: true,
      sparse: true
    },

    referredBy: {
      type: String
    },

    referralRewarded: {
      type: Boolean,
      default: false
    },

    emailToken: String,
    emailTokenExpire: Date,

    resetToken: String,
    resetExpire: Date
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
