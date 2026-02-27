const asyncHandler = require("../middlewares/asyncHandler");
const User = require("../models/user.model");
const Order = require("../models/order.model");
const Transaction = require("../models/transaction.model");
const logger = require("../utils/logger");

const parsePagination = (query) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limitRaw = parseInt(query.limit, 10) || 20;
  const limit = Math.min(Math.max(limitRaw, 1), 100);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

// @desc    Admin stats
// @route   GET /api/admin/stats
// @access  Private (Admin)
const getStats = asyncHandler(async (req, res) => {
  const [totalUsers, totalRiders, totalTransactions, revenueAgg] =
    await Promise.all([
      User.countDocuments({ isActive: true }),
      User.countDocuments({ role: "Rider", isActive: true }),
      Transaction.countDocuments(),
      Order.aggregate([
        { $match: { status: "Delivered", paymentStatus: "Paid" } },
        { $group: { _id: null, total: { $sum: "$price" } } },
      ]),
    ]);

  const totalRevenue = revenueAgg[0]?.total || 0;

  logger.info("admin_stats_viewed", { adminId: req.user.id });

  res.status(200).json({
    totalUsers,
    totalRiders,
    totalTransactions,
    totalRevenue,
  });
});

// @desc    Admin list orders
// @route   GET /api/admin/orders
// @access  Private (Admin)
const listOrders = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const [orders, total] = await Promise.all([
    Order.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
    Order.countDocuments(),
  ]);
  logger.info("admin_orders_viewed", { adminId: req.user.id });
  res.status(200).json({
    page,
    pages: Math.ceil(total / limit) || 1,
    total,
    count: orders.length,
    data: orders,
  });
});

// @desc    Admin list transactions
// @route   GET /api/admin/transactions
// @access  Private (Admin)
const listTransactions = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const [txns, total] = await Promise.all([
    Transaction.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
    Transaction.countDocuments(),
  ]);
  logger.info("admin_transactions_viewed", { adminId: req.user.id });
  res.status(200).json({
    page,
    pages: Math.ceil(total / limit) || 1,
    total,
    count: txns.length,
    data: txns,
  });
});

module.exports = {
  getStats,
  listOrders,
  listTransactions,
};
