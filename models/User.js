const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true
    },

    password: {
      type: String,
      required: function () {
        return this.authProvider === "local";
      }
    },

    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local"
    },

    pan: String,
    dob: Date,

    gender: {
      type: String,
      enum: ["male", "female", "other"],
      lowercase: true
    },

    mobile: String,

    profilePhoto: String,

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user"
    },

    wallet: {
      type: Number,
      default: 0
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

    loginAttempts: {
      type: Number,
      default: 0
    },

    otp: String,
    otpExpire: Date,
    otpLastSent: Date,
    otpAttempts: { type: Number, default: 0 },

    isVerified: {
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
