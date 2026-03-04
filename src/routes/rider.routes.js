const express = require("express");
const { body, validationResult } = require("express-validator");
const {
  setRiderStatus,
  getRiderEarnings,
  getRiderOrders,
} = require("../controllers/rider.controller");
const { protect, authorize } = require("../middlewares/auth.middleware");

const router = express.Router();

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ status: "error", errors: errors.array() });
  }
  next();
};

router.patch(
  "/status",
  protect,
  authorize("Rider"),
  [body("status").isIn(["Online", "Offline"]).withMessage("invalid status")],
  handleValidationErrors,
  setRiderStatus
);

router.get("/earnings", protect, authorize("Rider"), getRiderEarnings);
router.get("/orders", protect, authorize("Rider"), getRiderOrders);

module.exports = router;
