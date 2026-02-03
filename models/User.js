const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullName: {
  type: String,
  required: function () {
    return this.isVerified === true;
  }
},

userId: {
  type: String,
  unique: true,
  index: true,
  required: function () {
    return this.isVerified === true;
  }
},


    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true
    },

   password: {
  type: String,
  required: function () {
    return this.isVerified === true && this.googleAuth === false;
  }
},

googleAuth: {
  type: Boolean,
  default: false
},

signupBonusGiven: {
  type: Boolean,
  default: false
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

    coins: {
      type: Number,
      default: 0
    },
lastAdWatchedAt: {
  type: Date,
  default: null
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
    referralCode: {
  type: String,
  unique: true
},

referredBy: {
  type: String // referralCode of referrer
},

referralRewarded: {
  type: Boolean,
  default: false
},
resetPasswordToken: String,
resetPasswordExpire: Date,


    emailToken: String,
    emailTokenExpire: Date,

    resetToken: String,
    resetExpire: Date
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
