const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    volume: { type: Number, default: 0 },
    quantity: { type: Number, default: 1 },
    custom: { type: Boolean, default: false },
}, { _id: false });

const floorSchema = new mongoose.Schema({
    floorLevel: { type: String, default: "ground" },
    hasLift: { type: Boolean, default: true },
    hasParking: { type: Boolean, default: true },
}, { _id: false });

const locationSchema = new mongoose.Schema({
    address: { type: String, default: "" },
    postcode: { type: String, default: "" },
    town: { type: String, default: "" },
    region: { type: String, default: "" },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
}, { _id: false });

const bookingSchema = new mongoose.Schema({
    // Reference
    bookingRef: {
        type: String,
        unique: true,
        default: () => "KM" + Date.now().toString().slice(-6) + Math.random().toString(36).slice(2, 5).toUpperCase(),
    },

    // Service
    serviceType: { type: String, required: true },

    // Locations
    pickup: { type: locationSchema, default: {} },
    delivery: { type: locationSchema, default: {} },
    pickupFloor: { type: floorSchema, default: {} },
    deliveryFloor: { type: floorSchema, default: {} },

    // Items
    items: [itemSchema],
    totalVolume: { type: Number, default: 0 },

    // Date & Time (UK timezone stored as string)
    dateType: { type: String, enum: ["specific", "flexible"], default: "specific" },
    date: { type: String, default: "" },       // YYYY-MM-DD
    timeSlot: { type: String, default: "" },

    // Extras
    helperCount: { type: Number, default: 0 },
    dismantleCount: { type: Number, default: 0 },
    assemblyCount: { type: Number, default: 0 },
    packingService: { type: Boolean, default: false },
    specialInstructions: { type: String, default: "" },

    // Distance
    distance: { type: Number, default: 0 },

    // Price
    totalPrice: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    priceBreakdown: [{ label: String, amount: Number }],

    // Customer details (filled at confirm step)
    customer: {
        name: { type: String, default: "" },
        phone: { type: String, default: "" },
        email: { type: String, default: "" },
        whatsapp: { type: String, default: "" },
        businessDelivery: { type: Boolean, default: false },
    },

    // Status
    status: {
        type: String,
        enum: ["pending", "confirmed", "in_progress", "completed", "cancelled"],
        default: "pending",
    },

    // Admin notes
    adminNotes: { type: String, default: "" },

}, { timestamps: true });

module.exports = mongoose.model("Booking", bookingSchema);