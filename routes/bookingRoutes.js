const express = require("express");
const router = express.Router();

const {
    createBooking,
    getAllBookings,
    getBooking,
    getBookingByRef,
    updateBookingStatus,
    deleteBooking,
    updateBookingPrice,
    sendInvoice,
    getInvoiceBookings,
} = require("../controllers/bookingController");


router.post("/", createBooking);

router.get("/", getAllBookings);

// invoice bookings only
router.get("/invoices", getInvoiceBookings);

router.get("/ref/:bookingRef", getBookingByRef);

router.get("/:id", getBooking);

router.patch("/:id/status", updateBookingStatus);

router.patch("/:id/price", updateBookingPrice);

router.post("/:id/send-invoice", sendInvoice);

router.delete("/:id", deleteBooking);


module.exports = router;