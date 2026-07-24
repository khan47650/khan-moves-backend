const Service = require("../models/Service");

const slugify = value => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
const errorMessage = err => err.name === "CastError" ? "Invalid inventory ID." : err.message;
const getCategory = (service, id) => service.categories.id(id);

const findItem = (service, itemId) => {
    for (const category of service.categories) {
        const item = category.items.id(itemId);
        if (item) return { category, item };
    }
    return null;
};

const itemResponse = (item, category) => ({
    ...item.toObject(),
    categoryId: category._id,
    categoryName: category.name
});

const getAllServices = async (req, res) => {
    try {
        const services = await Service.find().sort({ createdAt: 1 });
        res.json({ success: true, data: services });
    } catch (err) {
        res.status(500).json({ success: false, message: errorMessage(err) });
    }
};

const createService = async (req, res) => {
    try {
        const label = req.body.label?.trim();
        if (!label) return res.status(400).json({ success: false, message: "Service name is required." });

        const slug = slugify(label);
        if (!slug) return res.status(400).json({ success: false, message: "Enter a valid service name." });

        const exists = await Service.findOne({ slug });
        if (exists) return res.status(409).json({ success: false, message: "A service with this name already exists." });

        const service = await Service.create({ label, slug, categories: [] });
        res.status(201).json({ success: true, data: service });
    } catch (err) {
        res.status(500).json({ success: false, message: errorMessage(err) });
    }
};

const updateService = async (req, res) => {
    try {
        const label = req.body.label?.trim();
        if (!label) return res.status(400).json({ success: false, message: "Service name is required." });

        const slug = slugify(label);
        const duplicate = await Service.findOne({
            slug,
            _id: { $ne: req.params.serviceId }
        });

        if (duplicate) return res.status(409).json({
            success: false,
            message: "A service with this name already exists."
        });

        const service = await Service.findByIdAndUpdate(
            req.params.serviceId,
            { label, slug },
            { new: true, runValidators: true }
        );

        if (!service) return res.status(404).json({ success: false, message: "Service not found." });
        res.json({ success: true, data: service });
    } catch (err) {
        res.status(500).json({ success: false, message: errorMessage(err) });
    }
};

const deleteService = async (req, res) => {
    try {
        const service = await Service.findByIdAndDelete(req.params.serviceId);
        if (!service) return res.status(404).json({ success: false, message: "Service not found." });
        res.json({ success: true, message: "Service deleted successfully." });
    } catch (err) {
        res.status(500).json({ success: false, message: errorMessage(err) });
    }
};

/* Categories */

const addCategory = async (req, res) => {
    try {
        const name = req.body.name?.trim();
        if (!name) return res.status(400).json({ success: false, message: "Category name is required." });

        const service = await Service.findById(req.params.serviceId);
        if (!service) return res.status(404).json({ success: false, message: "Service not found." });

        const slug = slugify(name);
        const exists = service.categories.some(category => category.slug === slug);

        if (exists) return res.status(409).json({
            success: false,
            message: "This category already exists in the selected service."
        });

        service.categories.push({ name, slug, items: [] });
        await service.save();

        res.status(201).json({
            success: true,
            data: service.categories[service.categories.length - 1]
        });
    } catch (err) {
        res.status(500).json({ success: false, message: errorMessage(err) });
    }
};

const updateCategory = async (req, res) => {
    try {
        const name = req.body.name?.trim();
        if (!name) return res.status(400).json({ success: false, message: "Category name is required." });

        const service = await Service.findById(req.params.serviceId);
        if (!service) return res.status(404).json({ success: false, message: "Service not found." });

        const category = getCategory(service, req.params.categoryId);
        if (!category) return res.status(404).json({ success: false, message: "Category not found." });

        const slug = slugify(name);
        const duplicate = service.categories.some(item =>
            item._id.toString() !== category._id.toString() && item.slug === slug
        );

        if (duplicate) return res.status(409).json({
            success: false,
            message: "This category already exists in the selected service."
        });

        category.name = name;
        category.slug = slug;
        await service.save();

        res.json({ success: true, data: category });
    } catch (err) {
        res.status(500).json({ success: false, message: errorMessage(err) });
    }
};

const deleteCategory = async (req, res) => {
    try {
        const service = await Service.findById(req.params.serviceId);
        if (!service) return res.status(404).json({ success: false, message: "Service not found." });

        const category = getCategory(service, req.params.categoryId);
        if (!category) return res.status(404).json({ success: false, message: "Category not found." });

        service.categories.pull(category._id);
        await service.save();

        res.json({
            success: true,
            message: "Category and its items deleted successfully."
        });
    } catch (err) {
        res.status(500).json({ success: false, message: errorMessage(err) });
    }
};

/* Items */

const addItem = async (req, res) => {
    try {
        const { name, volume, categoryId } = req.body;
        const itemName = name?.trim();
        const itemVolume = Number(volume);

        if (!itemName) return res.status(400).json({ success: false, message: "Item name is required." });
        if (!categoryId) return res.status(400).json({ success: false, message: "Select a category." });
        if (!Number.isFinite(itemVolume) || itemVolume <= 0) return res.status(400).json({
            success: false,
            message: "Enter a valid volume (m³)."
        });

        const service = await Service.findById(req.params.serviceId);
        if (!service) return res.status(404).json({ success: false, message: "Service not found." });

        const category = getCategory(service, categoryId);
        if (!category) return res.status(404).json({ success: false, message: "Category not found." });

        category.items.push({
            name: itemName,
            volume: itemVolume,
            isPaused: false
        });

        await service.save();

        const item = category.items[category.items.length - 1];
        res.status(201).json({
            success: true,
            data: itemResponse(item, category)
        });
    } catch (err) {
        res.status(500).json({ success: false, message: errorMessage(err) });
    }
};

const updateItem = async (req, res) => {
    try {
        const { name, volume, categoryId } = req.body;
        const service = await Service.findById(req.params.serviceId);

        if (!service) return res.status(404).json({ success: false, message: "Service not found." });

        const result = findItem(service, req.params.itemId);
        if (!result) return res.status(404).json({ success: false, message: "Item not found." });

        const { category: oldCategory, item } = result;
        const targetCategory = categoryId ? getCategory(service, categoryId) : oldCategory;

        if (!targetCategory) return res.status(404).json({ success: false, message: "Category not found." });

        const itemName = name === undefined ? item.name : name.trim();
        const itemVolume = volume === undefined ? item.volume : Number(volume);

        if (!itemName) return res.status(400).json({ success: false, message: "Item name is required." });
        if (!Number.isFinite(itemVolume) || itemVolume <= 0) return res.status(400).json({
            success: false,
            message: "Enter a valid volume (m³)."
        });

        if (oldCategory._id.toString() !== targetCategory._id.toString()) {
            const movedItem = {
                _id: item._id,
                name: itemName,
                volume: itemVolume,
                isPaused: item.isPaused
            };

            oldCategory.items.pull(item._id);
            targetCategory.items.push(movedItem);
            await service.save();

            const updatedItem = targetCategory.items.id(item._id);
            return res.json({
                success: true,
                data: itemResponse(updatedItem, targetCategory)
            });
        }

        item.name = itemName;
        item.volume = itemVolume;
        await service.save();

        res.json({
            success: true,
            data: itemResponse(item, oldCategory)
        });
    } catch (err) {
        res.status(500).json({ success: false, message: errorMessage(err) });
    }
};

const deleteItem = async (req, res) => {
    try {
        const service = await Service.findById(req.params.serviceId);
        if (!service) return res.status(404).json({ success: false, message: "Service not found." });

        const result = findItem(service, req.params.itemId);
        if (!result) return res.status(404).json({ success: false, message: "Item not found." });

        result.category.items.pull(result.item._id);
        await service.save();

        res.json({ success: true, message: "Item deleted successfully." });
    } catch (err) {
        res.status(500).json({ success: false, message: errorMessage(err) });
    }
};

const togglePauseItem = async (req, res) => {
    try {
        const service = await Service.findById(req.params.serviceId);
        if (!service) return res.status(404).json({ success: false, message: "Service not found." });

        const result = findItem(service, req.params.itemId);
        if (!result) return res.status(404).json({ success: false, message: "Item not found." });

        result.item.isPaused = !result.item.isPaused;
        await service.save();

        res.json({
            success: true,
            data: itemResponse(result.item, result.category)
        });
    } catch (err) {
        res.status(500).json({ success: false, message: errorMessage(err) });
    }
};

const bulkPauseItems = async (req, res) => {
    try {
        const { itemIds, pause } = req.body;

        if (!Array.isArray(itemIds) || !itemIds.length) return res.status(400).json({
            success: false,
            message: "itemIds array is required."
        });

        if (typeof pause !== "boolean") return res.status(400).json({
            success: false,
            message: "pause must be true or false."
        });

        const service = await Service.findById(req.params.serviceId);
        if (!service) return res.status(404).json({ success: false, message: "Service not found." });

        const idSet = new Set(itemIds.map(String));

        service.categories.forEach(category => {
            category.items.forEach(item => {
                if (idSet.has(item._id.toString())) item.isPaused = pause;
            });
        });

        await service.save();

        res.json({
            success: true,
            message: `Items ${pause ? "paused" : "resumed"} successfully.`
        });
    } catch (err) {
        res.status(500).json({ success: false, message: errorMessage(err) });
    }
};

const bulkDeleteItems = async (req, res) => {
    try {
        const { itemIds } = req.body;

        if (!Array.isArray(itemIds) || !itemIds.length) return res.status(400).json({
            success: false,
            message: "itemIds array is required."
        });

        const service = await Service.findById(req.params.serviceId);
        if (!service) return res.status(404).json({ success: false, message: "Service not found." });

        const idSet = new Set(itemIds.map(String));

        service.categories.forEach(category => {
            category.items = category.items.filter(item => !idSet.has(item._id.toString()));
        });

        await service.save();
        res.json({ success: true, message: "Items deleted successfully." });
    } catch (err) {
        res.status(500).json({ success: false, message: errorMessage(err) });
    }
};

module.exports = {
    getAllServices,
    createService,
    updateService,
    deleteService,
    addCategory,
    updateCategory,
    deleteCategory,
    addItem,
    updateItem,
    deleteItem,
    togglePauseItem,
    bulkPauseItems,
    bulkDeleteItems
};