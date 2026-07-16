const Driver = require("../models/Driver");
const cloudinary = require("../utils/cloudinary");

// ── GET all drivers ──
const getAllDrivers = async (req, res) => {
    try {
        const drivers = await Driver.find().sort({ createdAt: -1 });
        res.json({ success: true, data: drivers });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── GET single driver ──
const getDriver = async (req, res) => {
    try {
        const driver = await Driver.findById(req.params.id);
        if (!driver)
            return res.status(404).json({ success: false, message: "Driver not found." });
        res.json({ success: true, data: driver });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── CREATE driver (with optional image + licence) ──
const createDriver = async (req, res) => {
    try {
        const { name, phone, licenseNumber, joiningDate, bankDetails } = req.body;
        if (!name || !name.trim())
            return res.status(400).json({ success: false, message: "Driver name is required." });

        let licensePdfUrl = "";
        let licensePdfPublicId = "";

        // Licence PDF upload
        if (req.files?.licence?.[0]) {
            const file = req.files.licence[0];
            const result = await new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    { folder: "khan-moves/drivers/licences", resource_type: "raw" },
                    (err, result) => err ? reject(err) : resolve(result)
                );
                stream.end(file.buffer);
            });
            licensePdfUrl = result.secure_url;
            licensePdfPublicId = result.public_id;
        }

        const driver = await Driver.create({
            name: name.trim(),
            phone: phone || "",
            licenseNumber: licenseNumber || "",
            joiningDate: joiningDate || "",
            bankDetails: bankDetails || "",
            licensePdfUrl,
            licensePdfPublicId,
        });

        res.status(201).json({ success: true, data: driver });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── UPDATE driver ──
const updateDriver = async (req, res) => {
    try {
        const driver = await Driver.findById(req.params.id);
        if (!driver)
            return res.status(404).json({ success: false, message: "Driver not found." });

        const { name, phone, licenseNumber, joiningDate, bankDetails } = req.body;

        if (name !== undefined) driver.name = name.trim();
        if (phone !== undefined) driver.phone = phone;
        if (licenseNumber !== undefined) driver.licenseNumber = licenseNumber;
        if (joiningDate !== undefined) driver.joiningDate = joiningDate;
        if (bankDetails !== undefined) driver.bankDetails = bankDetails;

        // New licence uploaded
        if (req.files?.licence?.[0]) {
            // Delete old licence from cloudinary
            if (driver.licensePdfPublicId) {
                await cloudinary.uploader.destroy(driver.licensePdfPublicId, { resource_type: "raw" });
            }
            const file = req.files.licence[0];
            const result = await new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    { folder: "khan-moves/drivers/licences", resource_type: "raw" },
                    (err, result) => err ? reject(err) : resolve(result)
                );
                stream.end(file.buffer);
            });
            driver.licensePdfUrl = result.secure_url;
            driver.licensePdfPublicId = result.public_id;
        }

        await driver.save();
        res.json({ success: true, data: driver });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── DELETE driver ──
const deleteDriver = async (req, res) => {
    try {
        const driver = await Driver.findById(req.params.id);
        if (!driver)
            return res.status(404).json({ success: false, message: "Driver not found." });

        if (driver.licensePdfPublicId) {
            await cloudinary.uploader.destroy(driver.licensePdfPublicId, { resource_type: "raw" });
        }

        await driver.deleteOne();
        res.json({ success: true, message: "Driver deleted successfully." });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { getAllDrivers, getDriver, createDriver, updateDriver, deleteDriver };