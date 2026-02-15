    const mongoose = require('mongoose');

    const driverLocationSchema = new mongoose.Schema(
    {
        driver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true, // 
        },
        currentOrder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: false,
        },
        location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point',
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: true,
            index: '2dsphere',
        },
        },
        updatedAt: {
        type: Date,
        default: Date.now,
        },
    },
    { timestamps: true }
    );

    // Compound index for faster queries
    driverLocationSchema.index({ driver: 1, currentOrder: 1 });

    const DriverLocation = mongoose.model('DriverLocation', driverLocationSchema);

    module.exports = DriverLocation;