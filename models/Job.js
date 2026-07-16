const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema({
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    bookingRef: { type: String, required: true },
    serviceType: { type: String, default: "" },
    customer: {
        name: { type: String, default: "" },
        phone: { type: String, default: "" },
        email: { type: String, default: "" },
        whatsapp: { type: String, default: "" },
    },
    pickup: {
        address: { type: String, default: "" },
        postcode: { type: String, default: "" },
        town: { type: String, default: "" },
        lat: { type: Number, default: null },
        lng: { type: Number, default: null },
    },
    delivery: {
        address: { type: String, default: "" },
        postcode: { type: String, default: "" },
        town: { type: String, default: "" },
        lat: { type: Number, default: null },
        lng: { type: Number, default: null },
    },
    pickupFloor: {
        floorLevel: { type: String, default: "ground" },
        hasLift: { type: Boolean, default: true },
        hasParking: { type: Boolean, default: true },
    },
    deliveryFloor: {
        floorLevel: { type: String, default: "ground" },
        hasLift: { type: Boolean, default: true },
        hasParking: { type: Boolean, default: true },
    },
    items: [{ name: String, volume: Number, quantity: Number }],
    totalVolume: { type: Number, default: 0 },
    date: { type: String, default: "" },
    dateType: { type: String, default: "specific" },
    timeSlot: { type: String, default: "" },
    distance: { type: Number, default: 0 },
    totalPrice: { type: Number, default: 0 },
    specialInstructions: { type: String, default: "" },
    assignedDriver: { type: mongoose.Schema.Types.ObjectId, ref: "Driver", default: null },
    assignedDriverName: { type: String, default: "" },
    assignedVehicle: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", default: null },
    assignedVehicleReg: { type: String, default: "" },
    status: {
        type: String,
        enum: ["active", "on_way", "in_trash", "completed"],
        default: "active",
    },
    adminNotes: { type: String, default: "" },
}, { timestamps: true });

module.exports = mongoose.model("Job", jobSchema);