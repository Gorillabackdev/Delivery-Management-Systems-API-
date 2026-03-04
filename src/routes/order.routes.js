const express = require("express");
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

router.route("/").post(protect, createOrder).get(protect, getAllOrders);

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
  .put(protect, authorize("Rider", "Admin"), updateOrderStatus);

router
  .route("/:id/location")
  .put(protect, authorize("Rider"), updateLocation);

router.route("/:id/track").get(protect, trackOrder);

module.exports = router;