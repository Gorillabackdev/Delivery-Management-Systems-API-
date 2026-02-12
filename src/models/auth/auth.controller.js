const jwt = require("jsonwebtoken");
const { User } = require("./auth.model");
const {
  normalizeRole,
  hashPassword,
  comparePassword,
  generateToken
} = require("./auth.service");

const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        status: "error",
        message: "name, email, and password are required"
      });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({
        status: "error",
        message: "email already in use"
      });
    }

    const hashedPassword = await hashPassword(password);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: normalizeRole(role)
    });

    const token = generateToken(user);

    return res.status(201).json({
      status: "success",
      token,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      }
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "registration failed",
      error: error.message
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: "error",
        message: "email and password are required"
      });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({
        status: "error",
        message: "invalid credentials"
      });
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        status: "error",
        message: "invalid credentials"
      });
    }

    const token = generateToken(user);

    return res.status(200).json({
      status: "success",
      token,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      }
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "login failed",
      error: error.message
    });
  }
};

const requireAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    if (!header.startsWith("Bearer ")) {
      return res.status(401).json({
        status: "error",
        message: "missing or invalid authorization header"
      });
    }

    const token = header.split(" ")[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(payload.id);
    if (!user) {
      return res.status(401).json({
        status: "error",
        message: "user no longer exists"
      });
    }

    req.user = { id: user._id, role: user.role };
    return next();
  } catch (error) {
    return res.status(401).json({
      status: "error",
      message: "unauthorized",
      error: error.message
    });
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        status: "error",
        message: "forbidden"
      });
    }
    return next();
  };
};

module.exports = {
  register,
  login,
  requireAuth,
  requireRole
};
