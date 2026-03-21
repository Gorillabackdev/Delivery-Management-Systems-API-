const express = require("express");
const { body, validationResult } = require("express-validator");
const { register, login, refresh, logout } = require("../controllers/auth.controller");

const router = express.Router();

const validateRegister = [
  body("name").trim().notEmpty().withMessage("name is required"),
  body("email").isEmail().withMessage("valid email is required"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("password must be at least 6 characters"),
  body("role").optional().isIn(["Admin", "User", "Rider"]).withMessage("invalid role"),
];

const validateLogin = [
  body("email").isEmail().withMessage("valid email is required"),
  body("password").notEmpty().withMessage("password is required"),
];
const validateRefresh = [
  body("refreshToken").notEmpty().withMessage("refreshToken is required"),
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ status: "error", errors: errors.array() });
  }
  next();
};

router.post("/register", validateRegister, handleValidationErrors, register);
router.post("/login", validateLogin, handleValidationErrors, login);
router.post("/refresh", validateRefresh, handleValidationErrors, refresh);
router.post("/logout", validateRefresh, handleValidationErrors, logout);

module.exports = router;
