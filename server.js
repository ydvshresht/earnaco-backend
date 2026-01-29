require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const helmet = require("helmet");
const hpp = require("hpp");

const { apiLimiter, securityHeaders } = require("./middleware/security");
const errorHandler = require("./middleware/errorHandler");
const webhookRoutes = require("./routes/webhookRoutes");

// 🔁 CRONS
require("./cron/dailyReset"); // ✅ needed

const app = express();
app.set("trust proxy", 1); // 🔥 REQUIRED FOR RENDER

/* =========================
   🔐 SECURITY MIDDLEWARES
========================= */
app.use(helmet());
app.use(hpp());
app.use(securityHeaders);

/* =========================
   🍪 COOKIES
========================= */
app.use(cookieParser());

/* =========================
   🌍 CORS CONFIG
========================= */
app.use(
  cors({
    origin: [
      "https://earnaco.com",
      "https://www.earnaco.com",
      "https://earnaco-frontend.vercel.app",
      "http://localhost:5173"
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  })
);

/* =========================
   📦 BODY PARSERS
========================= */
app.use(express.json()); // normal JSON

/* =========================
   ⚡ RATE LIMITING
========================= */
app.use("/api", apiLimiter);

/* =========================
   🧪 HEALTH CHECK
========================= */
app.get("/ping", (req, res) => {
  res.json({ msg: "Backend reachable 🚀" });
});

/* =========================
   🌐 STATIC FILES
========================= */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* =========================
   🚏 API ROUTES
========================= */
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/profile", require("./routes/profileRoutes"));
app.use("/api/tests", require("./routes/testRoutes"));
app.use("/api/results", require("./routes/resultRoutes"));
app.use("/api/wallet", require("./routes/walletRoutes"));
app.use("/api/contests", require("./routes/contestRoutes"));
app.use("/api/transactions", require("./routes/transactionRoutes"));
app.use("/api/support", require("./routes/supportRoutes"));
app.use("/api/payments", require("./routes/paymentRoutes"));

/* =========================
   🛡 ADMIN ROUTES
========================= */
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/admin", require("./routes/adminTestContestRoutes"));
app.use("/api/admin/analytics", require("./routes/adminAnalyticsRoutes"));

/* =========================
   🔔 RAZORPAY WEBHOOK
   (RAW BODY REQUIRED)
========================= */
app.post(
  "/api/webhook",
  express.raw({ type: "application/json" }),
  webhookRoutes
);

/* =========================
   ❌ ERROR HANDLER (LAST)
========================= */
app.use(errorHandler);

/* =========================
   🚀 SERVER + DB
========================= */
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB Connected");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
  });
