const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema({
    regNumber: { type: String, required: true, trim: true, unique: true },
    makeModel: { type: String, default: "" },
    type: { type: String, default: "" },
    category: { type: String, default: "" },
    loadingCapacity: { type: String, default: "" },
    payload: { type: String, default: "" },
    maxLength: { type: String, default: "" },
    motorbikesCapacity: { type: String, default: "" },
    tailLift: { type: String, default: "" },
    fuelType: { type: String, default: "" },
    seats: { type: String, default: "" },
    useOfTrailer: { type: String, default: "" },
    location: { type: String, default: "" },
    assignedDriver: { type: String, default: "" },
    taxExpiry: { type: String, default: "" },
    motExpiry: { type: String, default: "" },
    motPdfUrl: { type: String, default: "" },
    motPdfPublicId: { type: String, default: "" },
}, { timestamps: true });

module.exports = mongoose.model("Vehicle", vehicleSchema);