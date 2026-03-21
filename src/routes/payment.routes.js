const express = require("express");
const { body, validationResult } = require("express-validator");
const { payForOrder } = require("../controllers/payment.controller");
const {
  createPaymentIntent,
  handleWebhook,
} = require("../controllers/stripe.controller");
const { protect, authorize } = require("../middlewares/auth.middleware");

const router = express.Router();

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ status: "error", errors: errors.array() });
  }
  next();
};

// Wallet payment flow
router.post(
  "/pay",
  protect,
  authorize("User", "Admin"),
  [body("orderId").notEmpty().withMessage("orderId is required")],
  handleValidationErrors,
  payForOrder
);

// Stripe payment flow
router.post(
  "/stripe/intent",
  protect,
  authorize("User", "Admin"),
  [body("orderId").notEmpty().withMessage("orderId is required")],
  handleValidationErrors,
  createPaymentIntent
);
router.post("/stripe/webhook", handleWebhook);

module.exports = router;
