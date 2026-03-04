const asyncHandler = require("../middlewares/asyncHandler");
const Order = require("../models/order.model");
const User = require("../models/user.model");
const Delivery = require("../models/delivery.model");

const parsePagination = (query) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limitRaw = parseInt(query.limit, 10) || 20;
  const limit = Math.min(Math.max(limitRaw, 1), 100);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

const parseSort = (query) => {
  const allowed = new Set(["createdAt", "updatedAt", "price", "status"]);
  const sort = typeof query.sort === "string" ? query.sort : "-createdAt";
  const direction = sort.startsWith("-") ? -1 : 1;
  const field = sort.replace(/^-/, "");

  if (!allowed.has(field)) return { createdAt: -1 };
  return { [field]: direction };
};

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
    statusTimestamps: {
      pendingAt: new Date(),
    },
  });

  res.status(201).json(order);
});

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private
const getAllOrders = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const sort = parseSort(req.query);

  const filter = {};

  if (req.user.role === "Admin") {
    // no extra filter
  } else if (req.user.role === "Rider") {
    filter.$or = [
      { driver: req.user.id },
      { assignedDrivers: { $in: [req.user.id] } },
    ];
  } else {
    filter.customer = req.user.id;
  }

  if (req.query.status) {
    filter.status = req.query.status;
  }

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate("customer", "name email")
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Order.countDocuments(filter),
  ]);

  const pages = Math.ceil(total / limit) || 1;

  res.status(200).json({
    page,
    pages,
    total,
    count: orders.length,
    data: orders,
  });
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
  if (req.user.role === "Admin") {
    res.status(200).json(order);
    return;
  }

  if (req.user.role === "Rider") {
    const isAssigned =
      order.driver?.toString() === req.user.id ||
      order.assignedDrivers.some((id) => id.toString() === req.user.id);

    if (!isAssigned) {
      res.status(403);
      throw new Error("Not authorized");
    }

    res.status(200).json(order);
    return;
  }

  if (order.customer._id.toString() !== req.user.id) {
    res.status(403);
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

  const updates = {};
  if (req.body.pickupLocation) updates.pickupLocation = req.body.pickupLocation;
  if (req.body.dropoffLocation) updates.dropoffLocation = req.body.dropoffLocation;
  if (req.body.pickupTime) updates.pickupTime = req.body.pickupTime;
  if (req.body.items) updates.items = req.body.items;

  const updatedOrder = await Order.findByIdAndUpdate(req.params.id, updates, {
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
  order.statusTimestamps.cancelledAt = new Date();
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
  order.statusTimestamps.assignedAt = new Date();
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

  // Auto-assign: find up to 3 available riders
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
  order.statusTimestamps.assignedAt = new Date();
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
  const updatedOrder = await Order.findOneAndUpdate(
    { _id: req.params.id, status: "Assigned" },
    {
      $set: {
        status: "Accepted",
        driver: req.user.id,
        assignedDrivers: [], // or keep them for history, but usually we clear active pool
        "statusTimestamps.acceptedAt": new Date(),
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

    if (order.assignedDrivers.length === 0) {
      order.status = "Pending";
      order.statusTimestamps.assignedAt = null;
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

  if (req.user.role === "Rider") {
    if (!order.driver) {
      res.status(403);
      throw new Error("Not authorized");
    }
    if (order.driver.toString() !== req.user.id) {
      res.status(403);
      throw new Error("Not authorized");
    }
  }

  const allowedStatuses = [
    "Pending",
    "Assigned",
    "Accepted",
    "PickedUp",
    "Delivered",
    "Cancelled",
  ];

  if (!allowedStatuses.includes(status)) {
    res.status(400);
    throw new Error("Invalid status");
  }

  const validTransitions = {
    Pending: ["Assigned", "Cancelled"],
    Assigned: ["Accepted", "Cancelled"],
    Accepted: ["PickedUp", "Cancelled"],
    PickedUp: ["Delivered"],
    Delivered: [],
    Cancelled: [],
  };

  const nextAllowed = validTransitions[order.status] || [];
  if (!nextAllowed.includes(status)) {
    res.status(400);
    throw new Error(`Invalid status transition from ${order.status} to ${status}`);
  }

  if (status === "PickedUp") {
    order.statusTimestamps.pickedUpAt = new Date();
  }
  if (status === "Delivered") {
    order.statusTimestamps.deliveredAt = new Date();
  }
  if (status === "Cancelled") {
    order.statusTimestamps.cancelledAt = new Date();
  }

  order.status = status;
  await order.save();

  if (status === "PickedUp") {
    if (!order.driver) {
      res.status(400);
      throw new Error("Order has no assigned driver");
    }
    await Delivery.findOneAndUpdate(
      { order: order._id },
      {
        order: order._id,
        rider: order.driver,
        status: "InProgress",
      },
      { upsert: true, new: true }
    );
  }

  if (status === "Delivered") {
    if (!order.driver) {
      res.status(400);
      throw new Error("Order has no assigned driver");
    }
    const earnings = Math.round(order.price * 0.7);
    await Delivery.findOneAndUpdate(
      { order: order._id },
      {
        order: order._id,
        rider: order.driver,
        status: "Completed",
        confirmedAt: new Date(),
        earnings,
      },
      { upsert: true, new: true }
    );

    if (order.driver) {
      await User.findByIdAndUpdate(order.driver, {
        $inc: { riderEarnings: earnings, riderCompletedDeliveries: 1 },
      });
    }
  }

  res.status(200).json(order);
});

// @desc    Update driver location for an order
// @route   PUT /api/orders/:id/location
// @access  Private (Rider only)
const updateLocation = asyncHandler(async (req, res) => {
  const { lat, lng } = req.body; // Expecting { lat, lng }
  const orderId = req.params.id;

  // Validate input
  if (lat === undefined || lng === undefined) {
    res.status(400);
    throw new Error('Latitude and longitude are required');
  }

  const order = await Order.findById(orderId);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // Only the assigned driver can update location
  if (!order.driver || order.driver.toString() !== req.user.id) {
    res.status(403);
    throw new Error('You are not the assigned driver for this order');
  }

  // Restrict status to orders in progress
  if (!['Accepted', 'PickedUp'].includes(order.status)) {
    res.status(400);
    throw new Error('Location can only be updated while order is in progress');
  }

  // Import the DriverLocation model (or require at top of file)
  const DriverLocation = require('../models/driverLocation.model');

  // Upsert the driver's location
  await DriverLocation.findOneAndUpdate(
    { driver: req.user.id },
    {
      driver: req.user.id,
      currentOrder: order._id,
      location: { type: 'Point', coordinates: [lng, lat] },
      updatedAt: Date.now(),
    },
    { upsert: true, new: true }
  );

  res.status(200).json({ message: 'Location updated successfully' });
});

// @desc    Get order tracking info (including driver location)
// @route   GET /api/orders/:id/track
// @access  Private (Customer of the order, Admin, or assigned Rider)
const trackOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('customer', 'name email')
    .populate('driver', 'name');

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // Authorization check
  const isCustomer = order.customer._id.toString() === req.user.id;
  const isDriver = order.driver && order.driver._id.toString() === req.user.id;
  if (!isCustomer && !isDriver && req.user.role !== 'Admin') {
    res.status(403);
    throw new Error('Not authorized to track this order');
  }

  // Fetch latest driver location if a driver is assigned
  let driverLocation = null;
  if (order.driver) {
    const DriverLocation = require('../models/driverLocation.model');
    const loc = await DriverLocation.findOne({ driver: order.driver._id });
    if (loc && loc.location && loc.location.coordinates) {
      driverLocation = {
        coordinates: {
          lng: loc.location.coordinates[0],
          lat: loc.location.coordinates[1],
        },
        updatedAt: loc.updatedAt,
      };
    }
  }

  // Prepare response (customize as needed)
  res.status(200).json({
    order: {
      id: order._id,
      status: order.status,
      pickupLocation: order.pickupLocation,
      dropoffLocation: order.dropoffLocation,
      estimatedDelivery: order.pickupTime, // or calculate based on distance
      driver: order.driver ? order.driver.name : null,
    },
    driverLocation, // null if not available
  });
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
  updateLocation,
  trackOrder,
};
