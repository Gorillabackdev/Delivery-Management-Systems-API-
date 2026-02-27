const asyncHandler = require("../middlewares/asyncHandler");
const mongoose = require("mongoose");
const Order = require("../models/order.model");
const Wallet = require("../models/wallet.model");
const Transaction = require("../models/transaction.model");
const logger = require("../utils/logger");

// @desc    Pay for order using wallet
// @route   POST /api/payments/pay
// @access  Private (User)
const payForOrder = asyncHandler(async (req, res) => {
  const { orderId, idempotencyKey } = req.body;
  if (!orderId) {
    res.status(400);
    throw new Error("orderId is required");
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const order = await Order.findById(orderId).session(session);
    if (!order) {
      res.status(404);
      throw new Error("Order not found");
    }

    if (order.customer.toString() !== req.user.id) {
      res.status(403);
      throw new Error("Not authorized to pay for this order");
    }

    if (order.paymentStatus === "Paid") {
      res.status(200).json(order);
      await session.commitTransaction();
      return;
    }

    if (order.status === "Cancelled") {
      res.status(400);
      throw new Error("Cannot pay for cancelled order");
    }

    if (idempotencyKey) {
      const existing = await Transaction.findOne({ idempotencyKey }).session(session);
      if (existing) {
        await session.abortTransaction();
        res.status(200).json(existing);
        return;
      }
    }

    const wallet = await Wallet.findOne({ user: req.user.id }).session(session);
    if (!wallet) {
      res.status(404);
      throw new Error("Wallet not found");
    }

    if (wallet.balance < order.price) {
      res.status(400);
      throw new Error("Insufficient wallet balance");
    }

    const balanceBefore = wallet.balance;
    wallet.balance -= order.price;
    await wallet.save({ session });

    order.paymentStatus = "Paid";
    await order.save({ session });

    const txn = await Transaction.create(
      [
        {
          wallet: wallet._id,
          type: "Payment",
          amount: order.price,
          balanceBefore,
          balanceAfter: wallet.balance,
          fromUser: req.user.id,
          toUser: req.user.id,
          idempotencyKey,
          metadata: { orderId: order._id },
        },
      ],
      { session }
    );

    await session.commitTransaction();
    logger.info("payment_wallet", {
      userId: req.user.id,
      orderId: order._id,
      amount: order.price,
      transactionId: txn[0]._id,
    });
    res.status(201).json({ order, transaction: txn[0] });
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
});

module.exports = { payForOrder };
