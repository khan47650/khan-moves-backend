const Service = require("../models/Service");

// ── Helper ──
const slugify = (label) =>
    label.toLowerCase().trim().replace(/\s+/g, "_");



// GET /api/inventory/services
const getAllServices = async (req, res) => {
    try {
        const services = await Service.find().sort({ createdAt: 1 });
        res.json({ success: true, data: services });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// POST /api/inventory/services
const createService = async (req, res) => {
    try {
        const { label } = req.body;
        if (!label || !label.trim())
            return res.status(400).json({ success: false, message: "Service name is required." });

        const slug = slugify(label);

        const exists = await Service.findOne({ slug });
        if (exists)
            return res.status(409).json({ success: false, message: "A service with this name already exists." });

        const service = await Service.create({ label: label.trim(), slug, items: [] });
        res.status(201).json({ success: true, data: service });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// PUT /api/inventory/services/:serviceId
const updateService = async (req, res) => {
    try {
        const { label } = req.body;
        if (!label || !label.trim())
            return res.status(400).json({ success: false, message: "Service name is required." });

        const service = await Service.findByIdAndUpdate(
            req.params.serviceId,
            { label: label.trim() },
            { new: true }
        );
        if (!service)
            return res.status(404).json({ success: false, message: "Service not found." });

        res.json({ success: true, data: service });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// DELETE /api/inventory/services/:serviceId
const deleteService = async (req, res) => {
    try {
        const service = await Service.findByIdAndDelete(req.params.serviceId);
        if (!service)
            return res.status(404).json({ success: false, message: "Service not found." });

        res.json({ success: true, message: "Service deleted successfully." });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ────────────────────────────────────────────────
// ITEMS
// ────────────────────────────────────────────────

// POST /api/inventory/services/:serviceId/items
const addItem = async (req, res) => {
    try {
        const { name, volume} = req.body;
        if (!name || !name.trim())
            return res.status(400).json({ success: false, message: "Item name is required." });
        if (!volume || isNaN(volume) || Number(volume) <= 0)
            return res.status(400).json({ success: false, message: "Enter a valid volume (m³)." });

        const service = await Service.findById(req.params.serviceId);
        if (!service)
            return res.status(404).json({ success: false, message: "Service not found." });

        const newItem = {
            name: name.trim(),
            volume: Number(volume),
            isPaused: false,
        };

        service.items.push(newItem);
        await service.save();

        const addedItem = service.items[service.items.length - 1];
        res.status(201).json({ success: true, data: addedItem });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// PUT /api/inventory/services/:serviceId/items/:itemId
const updateItem = async (req, res) => {
    try {
        const { name, volume } = req.body;

        const service = await Service.findById(req.params.serviceId);
        if (!service)
            return res.status(404).json({ success: false, message: "Service not found." });

        const item = service.items.id(req.params.itemId);
        if (!item)
            return res.status(404).json({ success: false, message: "Item not found." });

        if (name !== undefined) item.name = name.trim();
        if (volume !== undefined) {
            if (isNaN(volume) || Number(volume) <= 0)
                return res.status(400).json({ success: false, message: "Enter a valid volume (m³)." });
            item.volume = Number(volume);
        }

        await service.save();
        res.json({ success: true, data: item });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// DELETE /api/inventory/services/:serviceId/items/:itemId
const deleteItem = async (req, res) => {
    try {
        const service = await Service.findById(req.params.serviceId);
        if (!service)
            return res.status(404).json({ success: false, message: "Service not found." });

        const item = service.items.id(req.params.itemId);
        if (!item)
            return res.status(404).json({ success: false, message: "Item not found." });

        item.deleteOne();
        await service.save();

        res.json({ success: true, message: "Item deleted successfully." });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// PATCH /api/inventory/services/:serviceId/items/:itemId/pause
const togglePauseItem = async (req, res) => {
    try {
        const service = await Service.findById(req.params.serviceId);
        if (!service)
            return res.status(404).json({ success: false, message: "Service not found." });

        const item = service.items.id(req.params.itemId);
        if (!item)
            return res.status(404).json({ success: false, message: "Item not found." });

        item.isPaused = !item.isPaused;
        await service.save();

        res.json({ success: true, data: item });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// PATCH /api/inventory/services/:serviceId/items/bulk-pause
const bulkPauseItems = async (req, res) => {
    try {
        const { itemIds, pause } = req.body;
        // pause: true = pause karo, false = resume karo

        if (!Array.isArray(itemIds) || itemIds.length === 0)
            return res.status(400).json({ success: false, message: "itemIds array is required." });

        const service = await Service.findById(req.params.serviceId);
        if (!service)
            return res.status(404).json({ success: false, message: "Service not found." });

        service.items.forEach(item => {
            if (itemIds.includes(item._id.toString())) {
                item.isPaused = pause;
            }
        });

        await service.save();
        res.json({ success: true, message: `Items ${pause ? 'paused' : 'resumed'} successfully.` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// DELETE /api/inventory/services/:serviceId/items/bulk-delete
const bulkDeleteItems = async (req, res) => {
    try {
        const { itemIds } = req.body;

        if (!Array.isArray(itemIds) || itemIds.length === 0)
            return res.status(400).json({ success: false, message: "itemIds array is required." });

        const service = await Service.findById(req.params.serviceId);
        if (!service)
            return res.status(404).json({ success: false, message: "Service not found." });

        service.items = service.items.filter(
            item => !itemIds.includes(item._id.toString())
        );

        await service.save();
        res.json({ success: true, message: "Items deleted successfully." });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = {
    getAllServices,
    createService,
    updateService,
    deleteService,
    addItem,
    updateItem,
    deleteItem,
    togglePauseItem,
    bulkPauseItems,
    bulkDeleteItems,
};