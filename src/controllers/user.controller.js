    const asyncHandler = require("../middlewares/asyncHandler");
    const User = require("../models/user.model");

    // @desc    Get all users
    // @route   GET /api/users
    // @access  Private (Admin only)
    const getAllUsers = asyncHandler(async (req, res) => {
    const users = await User.find({}).select("-password");
    res.status(200).json(users);
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

    await user.deleteOne();
    res.status(200).json({ message: "User removed" });
    });

    // @desc    Get current user profile
    // @route   GET /api/users/profile
    // @access  Private
    const getProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id).select("-password");
    res.status(200).json(user);
    });

    module.exports = {
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
    getProfile,
    };