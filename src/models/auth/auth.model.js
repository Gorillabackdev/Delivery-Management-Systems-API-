const mongoose = require("mongoose");

const ROLES = ["Admin", "User", "Rider"];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, enum: ROLES, default: "User" }
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

module.exports = { User, ROLES };
