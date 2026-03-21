const asyncHandler = require("../middlewares/asyncHandler");
const User = require("../models/user.model");
const Order = require("../models/order.model");

// @desc    Set rider online/offline
// @route   PATCH /api/rider/status
// @access  Private (Rider)
const setRiderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!["Online", "Offline"].includes(status)) {
    res.status(400);
    throw new Error("Invalid rider status");
  }

  const user = await User.findById(req.user.id);
  user.riderStatus = status;
  await user.save();

  res.status(200).json({ status: user.riderStatus });
});

// @desc    Get rider earnings
// @route   GET /api/rider/earnings
// @access  Private (Rider)
const getRiderEarnings = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  res.status(200).json({
    earnings: user.riderEarnings,
    completedDeliveries: user.riderCompletedDeliveries,
  });
});

// @desc    Rider delivery history
// @route   GET /api/rider/orders
// @access  Private (Rider)
const getRiderOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ driver: req.user.id }).sort({ createdAt: -1 });
  res.status(200).json(orders);
});

module.exports = {
  setRiderStatus,
  getRiderEarnings,
  getRiderOrders,
};
