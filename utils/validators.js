const Joi = require("joi");

/* =====================
   REGISTER (OTP / NORMAL)
===================== */
exports.registerSchema = Joi.object({
  fullName: Joi.string()
    .min(3)
    .required()
    .messages({
      "string.empty": "Full name is required",
      "string.min": "Full name must be at least 3 characters"
    }),

  email: Joi.string()
    .email()
    .required()
    .messages({
      "string.email": "Invalid email address",
      "string.empty": "Email is required"
    }),

  // password OPTIONAL (Google signup users won’t have it)
  password: Joi.string()
    .min(8)
    .pattern(/[A-Z]/)
    .pattern(/[0-9]/)
    .optional()
    .messages({
      "string.min": "Password must be at least 8 characters",
      "string.pattern.base":
        "Password must contain 1 uppercase letter and 1 number"
    }),

  // OTP is REQUIRED for OTP-based signup
  otp: Joi.string()
    .length(6)
    .optional()
    .messages({
      "string.length": "OTP must be 6 digits"
    }),

  // Optional referral code
  referralCode: Joi.string()
    .uppercase()
    .length(8)
    .optional()
});

/* =====================
   LOGIN (EMAIL / PASSWORD)
===================== */
exports.loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      "string.email": "Invalid email",
      "string.empty": "Email is required"
    }),

  password: Joi.string()
    .required()
    .messages({
      "string.empty": "Password is required"
    })
});

/* =====================
   GOOGLE LOGIN
===================== */
exports.googleLoginSchema = Joi.object({
  token: Joi.string().required()
});

/* =====================
   SEND OTP
===================== */
exports.sendOtpSchema = Joi.object({
  email: Joi.string().email().required()
});

/* =====================
   APPLY REFERRAL
===================== */
exports.applyReferralSchema = Joi.object({
  code: Joi.string().uppercase().length(8).required()
});
