const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { ROLES } = require("./auth.model");

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not set");
  }
  return process.env.JWT_SECRET;
};

const normalizeRole = (role) => {
  if (!role) return "User";
  return ROLES.includes(role) ? role : "User";
};

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

const comparePassword = (password, hashed) => {
  return bcrypt.compare(password, hashed);
};

const generateToken = (user) => {
  const payload = { id: user._id, role: user.role };
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
  return jwt.sign(payload, getJwtSecret(), { expiresIn });
};

module.exports = {
  normalizeRole,
  hashPassword,
  comparePassword,
  generateToken
};
