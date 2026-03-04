const asyncHandler = require("../middlewares/asyncHandler");
const User = require("../models/user.model");
const generateToken = require("../utils/token.utils");

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

  const token = generateToken(user._id, user.role);

  res.status(201).json({
    status: "success",
    token,
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

  const token = generateToken(user._id, user.role);

  res.status(200).json({
    status: "success",
    token,
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
};
