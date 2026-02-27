const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    wallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
    },
    type: {
      type: String,
      enum: ["Deposit", "Withdrawal", "TransferIn", "TransferOut", "Payment"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    fromUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    toUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    balanceBefore: {
      type: Number,
      required: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
    },
    metadata: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

transactionSchema.index({ wallet: 1, createdAt: -1 });

module.exports = mongoose.model("Transaction", transactionSchema);
