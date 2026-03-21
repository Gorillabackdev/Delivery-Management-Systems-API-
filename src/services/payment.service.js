const Payment = require("../models/payment");
const Order = require("../models/order.model");
const Delivery = require("../models/delivery.model");

/**
 * Create Payment
 */
exports.createPaymentService = async (orderId, method) => {
  const order = await Order.findById(orderId);
  if (!order) throw new Error("Order not found");

  const payment = await Payment.create({
    order: orderId,
    amount: order.price,
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

  // Update order payment status
  const order = await Order.findById(payment.order);
  if (order) {
    order.paymentStatus = "Paid";
    await order.save();
  }

  // Trigger delivery record if needed
  if (order) {
    await Delivery.findOneAndUpdate(
      { order: order._id },
      { order: order._id, rider: order.driver, status: "Pending" },
      { upsert: true }
    );
  }

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
