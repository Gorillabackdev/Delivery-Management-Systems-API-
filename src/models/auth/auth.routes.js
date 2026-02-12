const express = require("express");
const { register, login, requireAuth, requireRole } = require("./auth.controller");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);

// Example protected routes:
// router.get("/me", requireAuth, (req, res) => res.json({ user: req.user }));
// router.get("/admin", requireAuth, requireRole("Admin"), (req, res) => res.json({ ok: true }));

module.exports = router;
