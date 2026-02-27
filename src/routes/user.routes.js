    const express = require("express");
    const { body, validationResult } = require("express-validator");
    const router = express.Router();
    const {
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
    getProfile,
    deactivateUser,
    assignRole,
    changePassword,
    } = require("../controllers/user.controller");
    const { protect, authorize } = require("../middlewares/auth.middleware");

    // Validation middleware for update
    const validateUpdate = [
    body("email").optional().isEmail().withMessage("Please provide a valid email"),
    body("password").optional().isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
    body("role").optional().isIn(["Admin", "User", "Rider"]).withMessage("Invalid role"),
    ];
    const validateAssignRole = [
    body("role").isIn(["Admin", "User", "Rider"]).withMessage("Invalid role"),
    ];
    const validateChangePassword = [
    body("currentPassword").notEmpty().withMessage("currentPassword is required"),
    body("newPassword").isLength({ min: 6 }).withMessage("newPassword must be at least 6 characters"),
    ];

    // Validation error handler
    const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
    };

    // Profile route (must come before /:id to avoid conflict)
    router.get("/profile", protect, getProfile);
    router.patch("/change-password", protect, validateChangePassword, handleValidationErrors, changePassword);

    // Admin-only routes
    router.route("/")
    .get(protect, authorize("Admin"), getAllUsers);

    router.route("/:id")
    .get(protect, getUserById)          // Admin or self (checked in controller)
    .put(
        protect,
        validateUpdate,
        handleValidationErrors,
        updateUser
    )
    .delete(protect, authorize("Admin"), deleteUser); // Admin only

    router
    .route("/:id/deactivate")
    .patch(protect, authorize("Admin"), deactivateUser);

    router
    .route("/:id/role")
    .patch(
        protect,
        authorize("Admin"),
        validateAssignRole,
        handleValidationErrors,
        assignRole
    );

    module.exports = router;
