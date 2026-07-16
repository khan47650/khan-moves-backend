const express = require("express");
const router = express.Router();

const {
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
} = require("../controllers/inventoryController");

// ── Services ──
router.get("/services", getAllServices);
router.post("/services", createService);
router.put("/services/:serviceId", updateService);
router.delete("/services/:serviceId", deleteService);

// ── Items ──
router.post("/services/:serviceId/items", addItem);
router.put("/services/:serviceId/items/:itemId", updateItem);
router.delete("/services/:serviceId/items/:itemId", deleteItem);

// ── Item: pause toggle ──
router.patch("/services/:serviceId/items/:itemId/pause", togglePauseItem);

// ── Bulk operations ──
router.patch("/services/:serviceId/items/bulk-pause", bulkPauseItems);
router.delete("/services/:serviceId/items/bulk-delete", bulkDeleteItems);

module.exports = router;