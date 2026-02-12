const express = require("express");
const { register, login } = require("../controllers/auth.controller");
const { protect, authorize } = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);

module.exports = router;
