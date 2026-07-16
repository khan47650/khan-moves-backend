const express = require("express");
const router = express.Router();
const multer = require("multer");
const {
    getAllVehicles, getVehicle, createVehicle, updateVehicle, deleteVehicle
} = require("../controllers/vehicleController");

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype !== "application/pdf")
            return cb(new Error("Only PDF files allowed."));
        cb(null, true);
    },
});

const uploadFields = upload.fields([{ name: "motPdf", maxCount: 1 }]);

// MOT proxy (same pattern as driver licence)
router.get("/mot-proxy", async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ message: "URL required" });
    try {
        const axios = require("axios");
        const response = await axios.get(url, { responseType: "arraybuffer" });
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", 'attachment; filename="MOT.pdf"');
        res.send(response.data);
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch MOT." });
    }
});

router.get("/", getAllVehicles);
router.get("/:id", getVehicle);
router.post("/", uploadFields, createVehicle);
router.put("/:id", uploadFields, updateVehicle);
router.delete("/:id", deleteVehicle);

module.exports = router;