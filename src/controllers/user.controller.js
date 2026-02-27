const asyncHandler = require("../middlewares/asyncHandler");
const User = require("../models/user.model");
const logger = require("../utils/logger");

const parsePagination = (query) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limitRaw = parseInt(query.limit, 10) || 20;
  const limit = Math.min(Math.max(limitRaw, 1), 100);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

    // @desc    Get all users
    // @route   GET /api/users
    // @access  Private (Admin only)
    const getAllUsers = asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {};

    if (req.query.role) {
      filter.role = req.query.role;
    }

    if (req.query.q) {
      const q = req.query.q.trim();
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    const pages = Math.ceil(total / limit) || 1;

    res.status(200).json({
      page,
      pages,
      total,
      count: users.length,
      data: users,
    });
    });

    // @desc    Get single user by ID
    // @route   GET /api/users/:id
    // @access  Private (Admin or the user themselves)
    const getUserById = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }

    // Check if the requester is admin or the user themselves
    if (req.user.role !== "Admin" && req.user.id !== req.params.id) {
        res.status(403);
        throw new Error("Not authorized to view this user");
    }

    res.status(200).json(user);
    });

    // @desc    Update user
    // @route   PUT /api/users/:id
    // @access  Private (Admin or the user themselves)
    const updateUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }

    // Check authorization
    const isSelf = req.user.id === req.params.id;
    const isAdmin = req.user.role === "Admin";

    if (!isSelf && !isAdmin) {
        res.status(403);
        throw new Error("Not authorized to update this user");
    }

    // Fields that can be updated
    const { name, email, password, role } = req.body;

    // Self-service updates: can only change name, email, password
    if (isSelf && !isAdmin) {
        if (role) {
        res.status(403);
        throw new Error("You cannot change your own role");
        }
        if (name) user.name = name;
        if (email) user.email = email;
        if (password) user.password = password; // will be hashed by pre-save hook
    }

    // Admin updates: can change anything (including role)
    if (isAdmin) {
        if (name) user.name = name;
        if (email) user.email = email;
        if (password) user.password = password;
        if (role) user.role = role;
    }

    const updatedUser = await user.save();
    res.status(200).json({
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
    });
    });

    // @desc    Delete user
    // @route   DELETE /api/users/:id
    // @access  Private (Admin only)
    const deleteUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }

    if (user._id.toString() === req.user.id) {
        res.status(400);
        throw new Error("Admin cannot delete their own account");
    }

    user.isActive = false;
    user.deletedAt = new Date();
    await user.save();
    logger.info("user_deactivated", { adminId: req.user.id, userId: user._id });
    res.status(200).json({ message: "User deactivated" });
    });

    // @desc    Get current user profile
    // @route   GET /api/users/profile
    // @access  Private
    const getProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id).select("-password");
    res.status(200).json(user);
    });

    // @desc    Deactivate user
    // @route   PATCH /api/users/:id/deactivate
    // @access  Private (Admin only)
    const deactivateUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }

    if (!user.isActive) {
        res.status(400);
        throw new Error("User already deactivated");
    }

    user.isActive = false;
    user.deletedAt = new Date();
    await user.save();

    res.status(200).json({ message: "User deactivated" });
    });

    // @desc    Assign role
    // @route   PATCH /api/users/:id/role
    // @access  Private (Admin only)
    const assignRole = asyncHandler(async (req, res) => {
    const { role } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }

    user.role = role;
    await user.save();

    logger.info("user_role_assigned", {
        adminId: req.user.id,
        userId: user._id,
        role,
    });
    res.status(200).json({
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
    });
    });

    // @desc    Change password
    // @route   PATCH /api/users/change-password
    // @access  Private
    const changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        res.status(400);
        throw new Error("currentPassword and newPassword are required");
    }

    const user = await User.findById(req.user.id).select("+password");
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
        res.status(401);
        throw new Error("Current password is incorrect");
    }

    user.password = newPassword;
    await user.save();
    res.status(200).json({ message: "Password updated" });
    });

    module.exports = {
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
    getProfile,
    deactivateUser,
    assignRole,
    changePassword,
    };
