const asyncHandler = require("../middlewares/asyncHandler");
const Order = require("../models/order.model");
const User = require("../models/user.model");

// Helper function to calculate distance in km using Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371; // Radius of the earth in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
};

// @desc    Create new order
// @route   POST /api/orders
// @access  Private (User)
const createOrder = asyncHandler(async (req, res) => {
  const { pickupLocation, dropoffLocation, pickupTime, items } = req.body;

  if (!pickupLocation || !dropoffLocation || !items) {
    res.status(400);
    throw new Error("Please add all fields");
  }

  // Calculate price based on distance
  const lat1 = pickupLocation.coordinates[1]; // Latitude
  const lon1 = pickupLocation.coordinates[0]; // Longitude
  const lat2 = dropoffLocation.coordinates[1];
  const lon2 = dropoffLocation.coordinates[0];

  const distance = calculateDistance(lat1, lon1, lat2, lon2);
  
  // Pricing logic: Base price 150 + 500 per km (Naira)
  const basePrice = 1500;
  const ratePerKm = 500;
  const price = Math.round(basePrice + distance * ratePerKm);

  const order = await Order.create({
    customer: req.user.id,
    pickupLocation,
    dropoffLocation,
    pickupTime,
    items,
    price,
  });

  res.status(201).json(order);
});

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private
const getAllOrders = asyncHandler(async (req, res) => {
  let orders;

  if (req.user.role === "Admin") {
    orders = await Order.find().populate("customer", "name email");
  } else if (req.user.role === "Rider") {
    // Rider sees orders assigned to them directly, OR where they are in the assignedDrivers list, OR if they already accepted it
    orders = await Order.find({
      $or: [
        { driver: req.user.id },
        { assignedDrivers: { $in: [req.user.id] } },
      ],
    }).populate("customer", "name email");
  } else {
    // User sees their own orders
    orders = await Order.find({ customer: req.user.id });
  }

  res.status(200).json(orders);
});

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate(
    "customer",
    "name email"
  );

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  // Check access rights
  if (
    req.user.role !== "Admin" &&
    req.user.role !== "Rider" &&
    order.customer._id.toString() !== req.user.id
  ) {
    res.status(401);
    throw new Error("Not authorized");
  }

  res.status(200).json(order);
});

// @desc    Update order
// @route   PUT /api/orders/:id
// @access  Private (User)
const updateOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  if (order.customer.toString() !== req.user.id) {
    res.status(401);
    throw new Error("Not authorized");
  }

  if (order.status !== "Pending" && order.status !== "Assigned") {
    res.status(400);
    throw new Error("Cannot update order after it has been accepted or picked up");
  }

  const updatedOrder = await Order.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });

  res.status(200).json(updatedOrder);
});

// @desc    Cancel order
// @route   PUT /api/orders/:id/cancel
// @access  Private (User/Admin)
const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  if (req.user.role !== "Admin" && order.customer.toString() !== req.user.id) {
    res.status(401);
    throw new Error("Not authorized");
  }

  if (order.status !== "Pending" && order.status !== "Assigned") {
    res.status(400);
    throw new Error("Cannot cancel order after it has been processed");
  }

  order.status = "Cancelled";
  await order.save();

  res.status(200).json(order);
});

// @desc    Assign driver manually (can be multiple)
// @route   PUT /api/orders/:id/assign
// @access  Private (Admin)
const assignDriver = asyncHandler(async (req, res) => {
  const { driverIds } = req.body; // Expecting an array of driver IDs

  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  // Validate that all provided IDs are Riders
  const drivers = await User.find({ _id: { $in: driverIds }, role: "Rider" });
  if (drivers.length !== driverIds.length) {
    res.status(400);
    throw new Error("One or more invalid driver IDs");
  }

  // Converting to string to check uniqueness or just use $addToSet
  order.assignedDrivers = [...new Set([...order.assignedDrivers, ...driverIds])];
  
  order.status = "Assigned";
  await order.save();

  res.status(200).json(order);
});

// @desc    Auto assign driver (multiple)
// @route   PUT /api/orders/:id/auto-assign
// @access  Private (Admin/System)
const autoAssignDriver = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  // Auto-assign: find, say, up to 3 available riders
  const drivers = await User.find({ role: "Rider" }).limit(3);

  if (!drivers || drivers.length === 0) {
    res.status(404);
    throw new Error("No drivers available");
  }

  const driverIds = drivers.map((d) => d._id);
  
  const currentAssigned = order.assignedDrivers.map(d => d.toString());
  const newAssignments = driverIds.filter(d => !currentAssigned.includes(d.toString()));
  
  order.assignedDrivers.push(...newAssignments);
  order.status = "Assigned";
  await order.save();

  res.status(200).json(order);
});

// @desc    Accept order
// @route   PUT /api/orders/:id/accept
// @access  Private (Rider)
const acceptOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  if (order.status !== "Assigned") {
    res.status(400);
    throw new Error("Order is not available for acceptance");
  }

  // Check if this rider is in the assigned list
  const isAssigned = order.assignedDrivers.some(
    (driverId) => driverId.toString() === req.user.id
  );

  if (!isAssigned) {
    res.status(401);
    throw new Error("You are not assigned to this order");
  }

  // RACE CONDITION HANDLING:
  // Using findOneAndUpdate with status filter to ensure atomic update.
  // We need to re-query to do this atomically on the DB server side.
  const updatedOrder = await Order.findOneAndUpdate(
    { _id: req.params.id, status: "Assigned" },
    {
      $set: {
        status: "Accepted",
        driver: req.user.id,
        assignedDrivers: [], // or keep them for history, but usually we clear active pool
      },
    },
    { new: true }
  );

  if (!updatedOrder) {
    res.status(400);
    throw new Error("Order was already accepted by another driver");
  }

  res.status(200).json(updatedOrder);
});

// @desc    Decline order
// @route   PUT /api/orders/:id/decline
// @access  Private (Rider)
const declineOrder = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);

    if (!order) {
        res.status(404);
        throw new Error("Order not found");
    }

    if (order.status !== "Assigned") {
        res.status(400);
        throw new Error("Can only decline assigned orders");
    }

    // Check if user is in assigned list
    const isAssigned = order.assignedDrivers.some(
      (driverId) => driverId.toString() === req.user.id
    );

    if (!isAssigned) {
        res.status(401);
        throw new Error("You are not assigned to this order");
    }

    // Remove driver from assignedDrivers
    order.assignedDrivers = order.assignedDrivers.filter(
      (driverId) => driverId.toString() !== req.user.id
    );

    // If no drivers left, maybe set back to Pending? 
    // Or keep as Assigned (but to no one? that might break logic). 
    // Let's say if no assigned drivers, set to Pending.
    if (order.assignedDrivers.length === 0) {
      order.status = "Pending";
    }

    await order.save();

    res.status(200).json(order);
});


// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private (Rider/Admin)
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  if (req.user.role === "Rider" && order.driver.toString() !== req.user.id) {
    res.status(401);
    throw new Error("Not authorized");
  }

  // Simple status transition check
  if (status === "PickedUp" && order.status !== "Accepted") {
      res.status(400);
      throw new Error("Order must be accepted before pickup");
  }
  if (status === "Delivered" && order.status !== "PickedUp") {
      res.status(400);
      throw new Error("Order must be picked up before delivery");
  }

  order.status = status;
  await order.save();

  res.status(200).json(order);
});

module.exports = {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrder,
  cancelOrder,
  assignDriver,
  autoAssignDriver,
  acceptOrder,
  declineOrder,
  updateOrderStatus,
};
