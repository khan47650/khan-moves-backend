const express = require("express");
const router = express.Router();
const {
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
} = require("../controllers/inventoryController");

router.get("/services", getAllServices);
router.post("/services", createService);
router.put("/services/:serviceId", updateService);
router.delete("/services/:serviceId", deleteService);

router.post("/services/:serviceId/categories", addCategory);
router.put("/services/:serviceId/categories/:categoryId", updateCategory);
router.delete("/services/:serviceId/categories/:categoryId", deleteCategory);

router.post("/services/:serviceId/items", addItem);
router.patch("/services/:serviceId/items/bulk-pause", bulkPauseItems);
router.delete("/services/:serviceId/items/bulk-delete", bulkDeleteItems);
router.put("/services/:serviceId/items/:itemId", updateItem);
router.patch("/services/:serviceId/items/:itemId/pause", togglePauseItem);
router.delete("/services/:serviceId/items/:itemId", deleteItem);

module.exports = router;