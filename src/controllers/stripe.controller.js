const Stripe = require("stripe");
const asyncHandler = require("../middlewares/asyncHandler");
const Order = require("../models/order.model");
const Wallet = require("../models/wallet.model");
const Transaction = require("../models/transaction.model");
const logger = require("../utils/logger");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// @desc    Create Stripe payment intent for order
// @route   POST /api/payments/stripe/intent
// @access  Private (User)
const createPaymentIntent = asyncHandler(async (req, res) => {
  const { orderId } = req.body;
  if (!orderId) {
    res.status(400);
    throw new Error("orderId is required");
  }

  const order = await Order.findById(orderId);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  if (order.customer.toString() !== req.user.id) {
    res.status(403);
    throw new Error("Not authorized to pay for this order");
  }

  if (order.paymentStatus === "Paid") {
    res.status(200).json({ status: "already_paid" });
    return;
  }

  const currency = (process.env.STRIPE_CURRENCY || "usd").toLowerCase();
  const amount = Math.round(order.price * 100);

  const intent = await stripe.paymentIntents.create({
    amount,
    currency,
    metadata: {
      orderId: order._id.toString(),
      userId: req.user.id,
    },
  });

  res.status(201).json({
    clientSecret: intent.client_secret,
    paymentIntentId: intent.id,
  });
});

// @desc    Stripe webhook
// @route   POST /api/payments/stripe/webhook
// @access  Public (Stripe)
const handleWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    res.status(500);
    throw new Error("STRIPE_WEBHOOK_SECRET not configured");
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch (err) {
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object;
    const orderId = intent.metadata?.orderId;
    const userId = intent.metadata?.userId;

    if (orderId && userId) {
      const order = await Order.findById(orderId);
      if (order && order.paymentStatus !== "Paid") {
        order.paymentStatus = "Paid";
        await order.save();

        const wallet = await Wallet.findOne({ user: userId });
        const balanceBefore = wallet ? wallet.balance : 0;
        const balanceAfter = wallet ? wallet.balance : 0;

        const txn = await Transaction.create({
          ...(wallet ? { wallet: wallet._id } : {}),
          type: "Payment",
          amount: Math.round(intent.amount / 100),
          balanceBefore,
          balanceAfter,
          fromUser: userId,
          toUser: userId,
          idempotencyKey: intent.id,
          metadata: { orderId },
        });

        logger.info("payment_stripe_succeeded", {
          orderId,
          userId,
          paymentIntentId: intent.id,
          transactionId: txn._id,
        });
      }
    }
  }

  res.json({ received: true });
});

module.exports = {
  createPaymentIntent,
  handleWebhook,
};
