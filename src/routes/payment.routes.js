const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/payment.controller");

router.post("/", paymentController.createPayment);
router.patch("/:paymentId/success", paymentController.paymentSuccess);
router.patch("/:paymentId/fail", paymentController.paymentFailed);

module.exports = router;
