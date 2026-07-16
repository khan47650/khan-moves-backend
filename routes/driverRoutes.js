const express = require("express");
const router = express.Router();
const multer = require("multer");
const { getAllDrivers, getDriver, createDriver, updateDriver, deleteDriver } = require("../controllers/driverController");

// multer — memory storage (buffer directly to cloudinary)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
    fileFilter: (req, file, cb) => {
        if (file.fieldname === "image") {
            if (!file.mimetype.startsWith("image/"))
                return cb(new Error("Only image files allowed for profile photo."));
        }
        if (file.fieldname === "licence") {
            if (file.mimetype !== "application/pdf")
                return cb(new Error("Only PDF files allowed for licence."));
        }
        cb(null, true);
    },
});

const uploadFields = upload.fields([
    { name: "image", maxCount: 1 },
    { name: "licence", maxCount: 1 },
]);

router.get("/licence-proxy", async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ message: "URL required" });
    try {
        const axios = require("axios");
        const response = await axios.get(url, { responseType: "arraybuffer" });
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", 'attachment; filename="licence.pdf"');
        res.send(response.data);
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch licence" });
    }
});
router.get("/", getAllDrivers);
router.get("/:id", getDriver);
router.post("/", uploadFields, createDriver);
router.put("/:id", uploadFields, updateDriver);
router.delete("/:id", deleteDriver);

module.exports = router;