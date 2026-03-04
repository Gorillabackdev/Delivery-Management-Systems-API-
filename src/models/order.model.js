const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    assignedDrivers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    pickupLocation: {
      address: {
        type: String,
        required: [true, "Please add a pickup address"],
      },
      coordinates: {
        type: [Number],
        required: [true, "Please add pickup coordinates"],
        index: "2dsphere",
      },
    },
    dropoffLocation: {
      address: {
        type: String,
        required: [true, "Please add a dropoff address"],
      },
      coordinates: {
        type: [Number],
        required: [true, "Please add dropoff coordinates"],
        index: "2dsphere",
      },
    },
    pickupTime: {
      type: Date,
    },
    status: {
      type: String,
      enum: [
        "Pending",
        "Assigned",
        "Accepted",
        "PickedUp",
        "Delivered",
        "Cancelled",
      ],
      default: "Pending",
    },
    items: [
      {
        name: String,
        quantity: Number,
      },
    ],
    price: {
      type: Number,
      required: [true, "Please add a price"],
    },
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
