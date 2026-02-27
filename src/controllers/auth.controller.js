const asyncHandler = require("../middlewares/asyncHandler");
const User = require("../models/user.model");
const Wallet = require("../models/wallet.model");
const RefreshToken = require("../models/refreshToken.model");
const {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
} = require("../utils/token.utils");

const refreshTokenDays =
  parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS, 10) || 7;

const issueTokens = async (userId, role) => {
  const accessToken = generateAccessToken(userId, role);
  const refreshToken = generateRefreshToken();
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + refreshTokenDays * 24 * 60 * 60 * 1000);

  await RefreshToken.create({
    user: userId,
    tokenHash,
    expiresAt,
  });

  return { accessToken, refreshToken };
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error("name, email, and password are required");
  }

  const existing = await User.findOne({ email });
  if (existing) {
    res.status(409);
    throw new Error("email already in use");
  }

  // Create user - pre save hook will hash password
  const user = await User.create({
    name,
    email,
    password,
    role, // Validation is handled in the model
  });

  await Wallet.updateOne(
    { user: user._id },
    { $setOnInsert: { user: user._id, balance: 0 } },
    { upsert: true }
  );
  const tokens = await issueTokens(user._id, user.role);

  res.status(201).json({
    status: "success",
    token: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    },
  });
});

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("email and password are required");
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    res.status(401);
    throw new Error("invalid credentials");
  }

  // Check if password matches
  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    res.status(401);
    throw new Error("invalid credentials");
  }

  const tokens = await issueTokens(user._id, user.role);

  res.status(200).json({
    status: "success",
    token: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    },
  });
});

module.exports = {
  register,
  login,
  refresh: asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400);
      throw new Error("refreshToken is required");
    }

    const tokenHash = hashToken(refreshToken);
    const stored = await RefreshToken.findOne({ tokenHash });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      res.status(401);
      throw new Error("invalid refresh token");
    }

    const user = await User.findById(stored.user);
    if (!user || !user.isActive) {
      res.status(401);
      throw new Error("user not found or deactivated");
    }

    stored.revokedAt = new Date();
    await stored.save();

    const tokens = await issueTokens(user._id, user.role);

    res.status(200).json({
      status: "success",
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  }),
  logout: asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400);
      throw new Error("refreshToken is required");
    }

    const tokenHash = hashToken(refreshToken);
    const stored = await RefreshToken.findOne({ tokenHash });
    if (stored && !stored.revokedAt) {
      stored.revokedAt = new Date();
      await stored.save();
    }

    res.status(200).json({ status: "success", message: "logged out" });
  }),
};
