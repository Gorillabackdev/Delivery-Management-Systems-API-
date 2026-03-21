const express = require("express");
const {
  getStats,
  listOrders,
  listTransactions,
} = require("../controllers/admin.controller");
const { protect, authorize } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/stats", protect, authorize("Admin"), getStats);
router.get("/orders", protect, authorize("Admin"), listOrders);
router.get("/transactions", protect, authorize("Admin"), listTransactions);

module.exports = router;
