const express = require("express");
const { body, param, validationResult } = require("express-validator");
const router = express.Router();
const {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrder,
  cancelOrder,
  assignDriver,
  autoAssignDriver,
  acceptOrder,
  declineOrder,
  updateOrderStatus,
  updateLocation,
  trackOrder,
} = require("../controllers/order.controller");
const { protect, authorize } = require("../middlewares/auth.middleware");

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ status: "error", errors: errors.array() });
  }
  next();
};

const validateCreateOrder = [
  body("pickupLocation").notEmpty().withMessage("pickupLocation is required"),
  body("pickupLocation.address").notEmpty().withMessage("pickup address is required"),
  body("pickupLocation.coordinates")
    .isArray({ min: 2, max: 2 })
    .withMessage("pickup coordinates must be [lng, lat]"),
  body("dropoffLocation").notEmpty().withMessage("dropoffLocation is required"),
  body("dropoffLocation.address").notEmpty().withMessage("dropoff address is required"),
  body("dropoffLocation.coordinates")
    .isArray({ min: 2, max: 2 })
    .withMessage("dropoff coordinates must be [lng, lat]"),
  body("items").isArray({ min: 1 }).withMessage("items must be a non-empty array"),
];

const validateOrderStatus = [
  body("status")
    .isIn(["Pending", "Assigned", "Accepted", "PickedUp", "Delivered", "Cancelled"])
    .withMessage("invalid status"),
];

const validateLocation = [
  body("lat").isNumeric().withMessage("lat must be numeric"),
  body("lng").isNumeric().withMessage("lng must be numeric"),
];

router
  .route("/")
  .post(protect, validateCreateOrder, handleValidationErrors, createOrder)
  .get(protect, getAllOrders);

router
  .route("/:id")
  .get(protect, getOrderById)
  .put(protect, updateOrder);

router.route("/:id/cancel").put(protect, cancelOrder);

router
  .route("/:id/assign")
  .put(protect, authorize("Admin"), assignDriver);

router
  .route("/:id/auto-assign")
  .put(protect, authorize("Admin"), autoAssignDriver);

router
  .route("/:id/accept")
  .put(protect, authorize("Rider"), acceptOrder);
  
router
  .route("/:id/decline")
  .put(protect, authorize("Rider"), declineOrder);

router
  .route("/:id/status")
  .put(
    protect,
    authorize("Rider", "Admin"),
    validateOrderStatus,
    handleValidationErrors,
    updateOrderStatus
  );

router
  .route("/:id/location")
  .put(
    protect,
    authorize("Rider"),
    validateLocation,
    handleValidationErrors,
    updateLocation
  );

router.route("/:id/track").get(protect, trackOrder);

module.exports = router;
