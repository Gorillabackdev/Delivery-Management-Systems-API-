const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const authRoutes = require("./routes/auth.routes");
const orderRoutes = require("./routes/order.routes");
const errorHandler = require("./middlewares/errorHandler");

const app = express();

// Middlewares
app.use(express.json());
app.use(cors());
app.use(morgan("dev"));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);

// Test route
app.get("/", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Delivery Management API jsonfied",
  });
});

// Error Handler
app.use(errorHandler);

module.exports = app;
