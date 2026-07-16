const express = require("express");
const router = express.Router();

const {
    getQuickLinks,
    createQuickLink,
    updateQuickLink,
    deleteQuickLink,
    getQuickMessages,
    createQuickMessage,
    updateQuickMessage,
    deleteQuickMessage
} = require("../controllers/toolController");


router.get("/links", getQuickLinks);
router.post("/links", createQuickLink);
router.patch("/links/:id", updateQuickLink);
router.delete("/links/:id", deleteQuickLink);


router.get("/messages", getQuickMessages);
router.post("/messages", createQuickMessage);
router.patch("/messages/:id", updateQuickMessage);
router.delete("/messages/:id", deleteQuickMessage);


module.exports = router;