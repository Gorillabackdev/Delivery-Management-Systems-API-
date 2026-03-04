const express = require("express");
const { body, validationResult } = require("express-validator");
const {
  getWallet,
  listTransactions,
  deposit,
  withdraw,
  transfer,
} = require("../controllers/wallet.controller");
const { protect } = require("../middlewares/auth.middleware");

const router = express.Router();

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ status: "error", errors: errors.array() });
  }
  next();
};

const validateAmount = [
  body("amount").isNumeric().withMessage("amount must be numeric"),
];

router.get("/", protect, getWallet);
router.get("/transactions", protect, listTransactions);
router.post("/deposit", protect, validateAmount, handleValidationErrors, deposit);
router.post("/withdraw", protect, validateAmount, handleValidationErrors, withdraw);
router.post(
  "/transfer",
  protect,
  [
    body("toUserId").notEmpty().withMessage("toUserId is required"),
    body("amount").isNumeric().withMessage("amount must be numeric"),
  ],
  handleValidationErrors,
  transfer
);

module.exports = router;
