const express = require("express");
const router = express.Router();

const {
    createBooking,
    getAllBookings,
    getBooking,
    getBookingByRef,
    updateBookingStatus,
    deleteBooking,
    updateBooking,
    updateBookingPrice,
    sendInvoice,
    getInvoiceBookings,
    updatePaymentStatus
} = require("../controllers/bookingController");

const { protect, adminOnly } = require("../middleware/authMiddleware");

router.post("/", createBooking);

// ADMIN ONLY
router.get("/", protect, adminOnly, getAllBookings);
router.get("/invoices", protect, adminOnly, getInvoiceBookings);
router.get("/ref/:bookingRef", getBookingByRef);
router.get("/:id", protect, adminOnly, getBooking);

router.patch("/:id/status", protect, adminOnly, updateBookingStatus);
router.patch("/:id/price", protect, adminOnly, updateBookingPrice);
router.patch("/:id", protect, adminOnly, updateBooking);
router.post("/:id/send-invoice", protect, adminOnly, sendInvoice);
router.delete("/:id", protect, adminOnly, deleteBooking);
router.patch(
    "/:id/payment-status",
    protect,
    adminOnly,
    updatePaymentStatus
);

module.exports = router;