require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
require("./cron/dailyReset"); 
const app = express();
const path = require("path");
const helmet = require("helmet");
const { apiLimiter, securityHeaders } = require("./middleware/security");
const hpp = require("hpp");
const errorHandler = require("./middleware/errorHandler");
const webhookRoutes = require("./routes/webhookRoutes");

const cookieParser = require("cookie-parser");
app.use(cookieParser());
/**
 * 🔐 CORS CONFIG (VERY IMPORTANT)
 * Allows frontend (5173) to talk to backend (5000)
 */




aapp.use(cors({
  origin: [
    "https://earnaco.com",
    "https://www.earnaco.com",
    "https://earnaco-frontend.vercel.app",
  "http://localhost:5173"
  ],
   methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));





app.use(securityHeaders);
app.use("/api", apiLimiter);

// Body parser
app.use(express.json());

/**
 * 🧪 Test route (connection check)
 */
app.get("/ping", (req, res) => {
  res.json({ msg: "Backend reachable" });
});


app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  next();
});

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/protected", require("./routes/protectedRoutes"));
app.use("/api/tests", require("./routes/testRoutes"));
app.use("/api/results", require("./routes/resultRoutes"));
app.use("/api/profile", require("./routes/profileRoutes"));
app.use("/api/wallet", require("./routes/walletRoutes"));
app.use("/api/contests", require("./routes/contestRoutes"));
app.use("/api/transactions", require("./routes/transactionRoutes"));
app.use("/api/support", require("./routes/supportRoutes"));
app.use("/api/banks", require("./routes/bankRoutes"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/admin", require("./routes/adminRoutes.js"));
app.use("/api/admin", require("./routes/adminTestContestRoutes"));
app.use("/api/admin/analytics", require("./routes/adminAnalyticsRoutes"));
app.use("/api/payments", require("./routes/paymentRoutes.js"));
app.use("/api/admin", require("./routes/adminWithdrawRoutes"));
app.use(require("./middleware/trackUser"));
app.use(
 "/api/webhook",
 express.raw({type:"application/json"})
);
app.use("/api/webhook", webhookRoutes);
app.use(helmet());
app.use(hpp());


// AFTER all routes
app.use(errorHandler);

/**
 * 🌍 SERVER + DATABASE
 */
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected");
    require("./cron/prizeDistribution");
   app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });
