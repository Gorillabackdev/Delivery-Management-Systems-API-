const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");

const authRoutes = require("./routes/auth.routes");
const orderRoutes = require("./routes/order.routes");
const userRoutes = require("./routes/user.routes");   // <-- new
const walletRoutes = require("./routes/wallet.routes");
const riderRoutes = require("./routes/rider.routes");
const adminRoutes = require("./routes/admin.routes");
const paymentRoutes = require("./routes/payment.routes");
const errorHandler = require("./middlewares/errorHandler");

const app = express();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
});

// Stripe webhook needs raw body
app.use("/api/payments/stripe/webhook", express.raw({ type: "application/json" }));

// Middlewares
app.use(express.json());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
  })
);
app.use(morgan("dev"));
app.use(helmet());
app.use(limiter);
app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

// Routes
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/users", userRoutes);   // <-- new
app.use("/api/wallet", walletRoutes);
app.use("/api/rider", riderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/payments", paymentRoutes);

// Test route
app.get("/", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Delivery Management API jsonfied",
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: "Route not found",
  });
});

// Error Handler
app.use(errorHandler);

module.exports = app;
