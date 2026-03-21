const asyncHandler = require("../middlewares/asyncHandler");
const Wallet = require("../models/wallet.model");
const Transaction = require("../models/transaction.model");
const User = require("../models/user.model");
const mongoose = require("mongoose");
const logger = require("../utils/logger");

const parsePagination = (query) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limitRaw = parseInt(query.limit, 10) || 20;
  const limit = Math.min(Math.max(limitRaw, 1), 100);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

const getWallet = asyncHandler(async (req, res) => {
  const wallet = await Wallet.findOne({ user: req.user.id });
  if (!wallet) {
    res.status(404);
    throw new Error("Wallet not found");
  }

  res.status(200).json(wallet);
});

const listTransactions = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const wallet = await Wallet.findOne({ user: req.user.id });
  if (!wallet) {
    res.status(404);
    throw new Error("Wallet not found");
  }

  const [items, total] = await Promise.all([
    Transaction.find({ wallet: wallet._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Transaction.countDocuments({ wallet: wallet._id }),
  ]);

  res.status(200).json({
    page,
    pages: Math.ceil(total / limit) || 1,
    total,
    count: items.length,
    data: items,
  });
});

const deposit = asyncHandler(async (req, res) => {
  const { amount, idempotencyKey } = req.body;
  if (!amount || amount <= 0) {
    res.status(400);
    throw new Error("amount must be greater than 0");
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const wallet = await Wallet.findOne({ user: req.user.id }).session(session);
    if (!wallet) {
      res.status(404);
      throw new Error("Wallet not found");
    }

    if (idempotencyKey) {
      const existing = await Transaction.findOne({ idempotencyKey }).session(session);
      if (existing) {
        await session.abortTransaction();
        res.status(200).json(existing);
        return;
      }
    }

    const balanceBefore = wallet.balance;
    wallet.balance += amount;
    await wallet.save({ session });

    const txn = await Transaction.create(
      [
        {
          wallet: wallet._id,
          type: "Deposit",
          amount,
          balanceBefore,
          balanceAfter: wallet.balance,
          fromUser: req.user.id,
          toUser: req.user.id,
          idempotencyKey,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    logger.info("wallet_deposit", {
      userId: req.user.id,
      amount,
      transactionId: txn[0]._id,
    });
    res.status(201).json(txn[0]);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
});

const withdraw = asyncHandler(async (req, res) => {
  const { amount, idempotencyKey } = req.body;
  if (!amount || amount <= 0) {
    res.status(400);
    throw new Error("amount must be greater than 0");
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const wallet = await Wallet.findOne({ user: req.user.id }).session(session);
    if (!wallet) {
      res.status(404);
      throw new Error("Wallet not found");
    }

    if (wallet.balance < amount) {
      res.status(400);
      throw new Error("Insufficient balance");
    }

    if (idempotencyKey) {
      const existing = await Transaction.findOne({ idempotencyKey }).session(session);
      if (existing) {
        await session.abortTransaction();
        res.status(200).json(existing);
        return;
      }
    }

    const balanceBefore = wallet.balance;
    wallet.balance -= amount;
    await wallet.save({ session });

    const txn = await Transaction.create(
      [
        {
          wallet: wallet._id,
          type: "Withdrawal",
          amount,
          balanceBefore,
          balanceAfter: wallet.balance,
          fromUser: req.user.id,
          toUser: req.user.id,
          idempotencyKey,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    logger.info("wallet_withdrawal", {
      userId: req.user.id,
      amount,
      transactionId: txn[0]._id,
    });
    res.status(201).json(txn[0]);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
});

const transfer = asyncHandler(async (req, res) => {
  const { toUserId, amount, idempotencyKey } = req.body;
  if (!toUserId || !amount || amount <= 0) {
    res.status(400);
    throw new Error("toUserId and positive amount are required");
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const [fromWallet, toWallet, toUser] = await Promise.all([
      Wallet.findOne({ user: req.user.id }).session(session),
      Wallet.findOne({ user: toUserId }).session(session),
      User.findById(toUserId).session(session),
    ]);

    if (!fromWallet || !toWallet || !toUser) {
      res.status(404);
      throw new Error("Destination user or wallet not found");
    }

    if (fromWallet.balance < amount) {
      res.status(400);
      throw new Error("Insufficient balance");
    }

    if (idempotencyKey) {
      const existing = await Transaction.findOne({ idempotencyKey }).session(session);
      if (existing) {
        await session.abortTransaction();
        res.status(200).json(existing);
        return;
      }
    }

    const fromBefore = fromWallet.balance;
    const toBefore = toWallet.balance;

    fromWallet.balance -= amount;
    toWallet.balance += amount;

    await Promise.all([fromWallet.save({ session }), toWallet.save({ session })]);

    const txns = await Transaction.create(
      [
        {
          wallet: fromWallet._id,
          type: "TransferOut",
          amount,
          balanceBefore: fromBefore,
          balanceAfter: fromWallet.balance,
          fromUser: req.user.id,
          toUser: toUserId,
          idempotencyKey,
        },
        {
          wallet: toWallet._id,
          type: "TransferIn",
          amount,
          balanceBefore: toBefore,
          balanceAfter: toWallet.balance,
          fromUser: req.user.id,
          toUser: toUserId,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    logger.info("wallet_transfer", {
      fromUserId: req.user.id,
      toUserId,
      amount,
      transactionOutId: txns[0]._id,
      transactionInId: txns[1]._id,
    });
    res.status(201).json({ out: txns[0], in: txns[1] });
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
});

module.exports = {
  getWallet,
  listTransactions,
  deposit,
  withdraw,
  transfer,
};
