const Vehicle = require("../models/Vehicle");
const cloudinary = require("../utils/cloudinary");

// ── GET all ──
const getAllVehicles = async (req, res) => {
    try {
        const vehicles = await Vehicle.find().sort({ createdAt: -1 });
        res.json({ success: true, data: vehicles });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── GET single ──
const getVehicle = async (req, res) => {
    try {
        const vehicle = await Vehicle.findById(req.params.id);
        if (!vehicle)
            return res.status(404).json({ success: false, message: "Vehicle not found." });
        res.json({ success: true, data: vehicle });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── CREATE ──
const createVehicle = async (req, res) => {
    try {
        const {
            regNumber, makeModel, type, category,
            loadingCapacity, payload, maxLength, motorbikesCapacity,
            tailLift, fuelType, seats, useOfTrailer, location,
            assignedDriver, taxExpiry, motExpiry
        } = req.body;

        if (!regNumber || !regNumber.trim())
            return res.status(400).json({ success: false, message: "Registration number is required." });

        const exists = await Vehicle.findOne({ regNumber: regNumber.trim().toUpperCase() });
        if (exists)
            return res.status(409).json({ success: false, message: "A vehicle with this reg number already exists." });

        let motPdfUrl = "";
        let motPdfPublicId = "";

        if (req.files?.motPdf?.[0]) {
            const file = req.files.motPdf[0];
            const result = await new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    { folder: "khan-moves/vehicles/mot", resource_type: "raw" },
                    (err, result) => err ? reject(err) : resolve(result)
                );
                stream.end(file.buffer);
            });
            motPdfUrl = result.secure_url;
            motPdfPublicId = result.public_id;
        }

        const vehicle = await Vehicle.create({
            regNumber: regNumber.trim().toUpperCase(),
            makeModel: makeModel || "",
            type: type || "",
            category: category || "",
            loadingCapacity: loadingCapacity || "",
            payload: payload || "",
            maxLength: maxLength || "",
            motorbikesCapacity: motorbikesCapacity || "",
            tailLift: tailLift || "",
            fuelType: fuelType || "",
            seats: seats || "",
            useOfTrailer: useOfTrailer || "",
            location: location || "",
            assignedDriver: assignedDriver || "",
            taxExpiry: taxExpiry || "",
            motExpiry: motExpiry || "",
            motPdfUrl,
            motPdfPublicId,
        });

        res.status(201).json({ success: true, data: vehicle });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── UPDATE ──
const updateVehicle = async (req, res) => {
    try {
        const vehicle = await Vehicle.findById(req.params.id);
        if (!vehicle)
            return res.status(404).json({ success: false, message: "Vehicle not found." });

        const fields = [
            "regNumber", "makeModel", "type", "category",
            "loadingCapacity", "payload", "maxLength", "motorbikesCapacity",
            "tailLift", "fuelType", "seats", "useOfTrailer", "location",
            "assignedDriver", "taxExpiry", "motExpiry"
        ];
        fields.forEach(f => {
            if (req.body[f] !== undefined) vehicle[f] = req.body[f];
        });

        if (req.files?.motPdf?.[0]) {
            if (vehicle.motPdfPublicId) {
                await cloudinary.uploader.destroy(vehicle.motPdfPublicId, { resource_type: "raw" });
            }
            const file = req.files.motPdf[0];
            const result = await new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    { folder: "khan-moves/vehicles/mot", resource_type: "raw" },
                    (err, result) => err ? reject(err) : resolve(result)
                );
                stream.end(file.buffer);
            });
            vehicle.motPdfUrl = result.secure_url;
            vehicle.motPdfPublicId = result.public_id;
        }

        await vehicle.save();
        res.json({ success: true, data: vehicle });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── DELETE ──
const deleteVehicle = async (req, res) => {
    try {
        const vehicle = await Vehicle.findById(req.params.id);
        if (!vehicle)
            return res.status(404).json({ success: false, message: "Vehicle not found." });

        if (vehicle.motPdfPublicId) {
            await cloudinary.uploader.destroy(vehicle.motPdfPublicId, { resource_type: "raw" });
        }

        await vehicle.deleteOne();
        res.json({ success: true, message: "Vehicle deleted successfully." });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { getAllVehicles, getVehicle, createVehicle, updateVehicle, deleteVehicle };