const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    volume: { type: Number, required: true, min: 0 },
    isPaused: { type: Boolean, default: false },
}, { _id: true });

const serviceSchema = new mongoose.Schema({
    label: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    items: [itemSchema],
}, { timestamps: true });

module.exports = mongoose.model("Service", serviceSchema);