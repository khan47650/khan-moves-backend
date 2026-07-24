const mongoose = require("mongoose");

const dimensionsSchema = new mongoose.Schema({
    length: { type: Number, default: null },
    width: { type: Number, default: null },
    height: { type: Number, default: null },
    dimUnit: { type: String, default: "cm" },
    weight: { type: Number, default: null },
    weightUnit: { type: String, default: "kg" }
}, { _id: false });

const itemSchema = new mongoose.Schema({
    itemId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    },
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    },
    categoryName: {
        type: String,
        default: "",
        trim: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    volume: {
        type: Number,
        default: 0,
        min: 0
    },
    quantity: {
        type: Number,
        default: 1,
        min: 1
    },
    custom: {
        type: Boolean,
        default: false
    },
    weight: {
        type: Number,
        default: null,
        min: 0
    },
    notes: {
        type: String,
        default: "",
        trim: true,
        maxlength: 250
    },
    dimensions: {
        type: dimensionsSchema,
        default: undefined
    }
}, { _id: false });

const selectedAddOnItemSchema = new mongoose.Schema({
    itemId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    categoryName: {
        type: String,
        default: "",
        trim: true
    },
    quantity: {
        type: Number,
        default: 1,
        min: 1
    }
}, { _id: false });

const floorSchema = new mongoose.Schema({
    floorLevel: { type: String, default: "ground" },
    hasLift: { type: Boolean, default: true },
    hasParking: { type: Boolean, default: true }
}, { _id: false });

const locationSchema = new mongoose.Schema({
    address: { type: String, default: "" },
    postcode: { type: String, default: "" },
    town: { type: String, default: "" },
    region: { type: String, default: "" },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null }
}, { _id: false });

const bookingSchema = new mongoose.Schema({
    bookingRef: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    bookingSequence: {
        type: Number,
        unique: true,
        sparse: true,
        index: true
    },

    serviceType: {
        type: String,
        required: true
    },

    pickup: {
        type: locationSchema,
        default: () => ({})
    },

    delivery: {
        type: locationSchema,
        default: () => ({})
    },

    pickupFloor: {
        type: floorSchema,
        default: () => ({})
    },

    deliveryFloor: {
        type: floorSchema,
        default: () => ({})
    },

    items: {
        type: [itemSchema],
        default: []
    },

    totalVolume: {
        type: Number,
        default: 0,
        min: 0
    },

    dateType: {
        type: String,
        enum: ["specific", "flexible"],
        default: "specific"
    },

    date: {
        type: String,
        default: ""
    },

    timeSlot: {
        type: String,
        default: ""
    },

    helperCount: {
        type: Number,
        enum: [0, 1],
        default: 0
    },

    dismantleItems: {
        type: [selectedAddOnItemSchema],
        default: []
    },

    assemblyItems: {
        type: [selectedAddOnItemSchema],
        default: []
    },

    dismantleCount: {
        type: Number,
        default: 0,
        min: 0
    },

    assemblyCount: {
        type: Number,
        default: 0,
        min: 0
    },

    packingService: {
        type: Boolean,
        default: false
    },

    specialInstructions: {
        type: String,
        default: "",
        maxlength: 450
    },

    distance: {
        type: Number,
        default: 0,
        min: 0
    },

    totalPrice: {
        type: Number,
        required: true,
        min: 0
    },

    discount: {
        type: Number,
        default: 0
    },

    tax: {
        type: Number,
        default: 0
    },

    priceBreakdown: [{
        label: { type: String, default: "" },
        amount: { type: Number, default: 0 }
    }],

    customer: {
        name: { type: String, default: "" },
        phone: { type: String, default: "" },
        email: { type: String, default: "" },
        whatsapp: { type: String, default: "" },
        businessDelivery: { type: Boolean, default: false }
    },

    status: {
        type: String,
        enum: [
            "pending",
            "confirmed",
            "in_progress",
            "completed",
            "cancelled"
        ],
        default: "pending"
    },

    adminNotes: {
        type: String,
        default: ""
    }
}, { timestamps: true });

module.exports = mongoose.model("Booking", bookingSchema);