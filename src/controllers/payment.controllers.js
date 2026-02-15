const paymentService = require("../services/payment.service");

exports.createPayment = async (req, res) => {
  try {
    const { orderId, method } = req.body;

    const payment = await paymentService.createPaymentService(
      orderId,
      method
    );

    res.status(201).json(payment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.paymentSuccess = async (req, res) => {
  try {
    const payment = await paymentService.handlePaymentSuccess(
      req.params.paymentId
    );

    res.json({ message: "Payment successful", payment });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.paymentFailed = async (req, res) => {
  try {
    const payment = await paymentService.handlePaymentFailure(
      req.params.paymentId
    );

    res.json({ message: "Payment failed", payment });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
