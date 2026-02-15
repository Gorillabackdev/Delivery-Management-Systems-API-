const Payment = require("../models/payment");
const Order = require("../models/Order");
const Delivery = require("../models/Delivery");

/**
 * Create Payment
 */
exports.createPaymentService = async (orderId, method) => {
  const order = await Order.findById(orderId);
  if (!order) throw new Error("Order not found");

  const payment = await Payment.create({
    order: orderId,
    amount: order.totalAmount,
    method,
    status: "pending",
  });

  return payment;
};

/**
 * Handle Successful Payment
 */
exports.handlePaymentSuccess = async (paymentId) => {
  const payment = await Payment.findById(paymentId);
  if (!payment) throw new Error("Payment not found");

  // Update payment
  payment.status = "successful";
  payment.transactionRef = "TXN-" + Date.now();
  await payment.save();

  // 🔥 Update order status (THIS IS THE BONUS PART)
  const order = await Order.findById(payment.order);
  order.status = "paid";
  await order.save();

  // 🔥 Trigger Delivery
  await Delivery.create({
    order: order._id,
    status: "pending",
  });

  return payment;
};

/**
 * Handle Failed Payment
 */
exports.handlePaymentFailure = async (paymentId) => {
  const payment = await Payment.findById(paymentId);
  if (!payment) throw new Error("Payment not found");

  payment.status = "failed";
  await payment.save();

  return payment;
};
