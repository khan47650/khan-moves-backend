const Booking = require("../models/Booking");
const Counter = require("../models/Counter");
const sendEmail = require("../utils/sendEmail");
const {
    calculateTotalPrice,
    getPriceBreakdown
} = require("../utils/bookingPriceCalculator");
const { sendWhatsApp, sendWhatsAppDocument } = require("../utils/sendWhatsApp");

// ── Price calculator (same logic as frontend) ──────────────────────────────
const generateBookingReference = async () => {
    const counter = await Counter.findByIdAndUpdate(
        "bookingSequence",
        { $inc: { sequence: 1 } },
        {
            returnDocument: "after",
            upsert: true,
            setDefaultsOnInsert: true
        }
    );

    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/London",
        day: "2-digit",
        month: "2-digit",
        year: "2-digit"
    }).formatToParts(new Date());

    const getPart = type =>
        parts.find(part => part.type === type)?.value || "";

    const day = getPart("day");
    const month = getPart("month");
    const year = getPart("year");

    return {
        bookingSequence: counter.sequence,
        bookingRef: `KM${counter.sequence}-${day}-${month}-${year}`
    };
};

const sanitizeItems = (rawItems = []) => {
    return rawItems
        .filter(item => item?.name && Number(item.quantity || 0) > 0)
        .map(item => ({
            itemId: item.itemId || item._id || null,
            categoryId: item.categoryId || null,
            categoryName: String(item.categoryName || "").trim(),
            name: String(item.name).trim(),
            volume: Math.max(0, Number(item.volume) || 0),
            quantity: Math.max(
                1,
                Math.floor(Number(item.quantity) || 1)
            ),
            custom: Boolean(item.custom),
            weight:
                item.weight !== undefined && item.weight !== null
                    ? Math.max(0, Number(item.weight) || 0)
                    : null,
            notes: String(item.notes || "").trim(),
            dimensions: item.dimensions || undefined
        }));
};

const sanitizeAddOnItems = (rawItems = []) => {
    return rawItems
        .filter(item => item?.name && Number(item.quantity || 0) > 0)
        .map(item => ({
            itemId: item.itemId || item._id || null,
            name: String(item.name).trim(),
            categoryName: String(item.categoryName || "").trim(),
            quantity: Math.max(
                1,
                Math.floor(Number(item.quantity) || 1)
            )
        }));
};

const getItemsCount = items => {
    return items.reduce(
        (total, item) => total + (Number(item.quantity) || 0),
        0
    );
};

// ── POST /api/bookings ──────────────────────────────────────────────────────
const createBooking = async (req, res) => {
    try {
        const body = req.body;

        const items = sanitizeItems(body.items || []);

        if (items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Please select at least one item."
            });
        }

        const specialInstructions = String(
            body.specialInstructions || ""
        );

        if (specialInstructions.length > 450) {
            return res.status(400).json({
                success: false,
                message: "Special instructions cannot exceed 450 characters."
            });
        }

        const totalVolume = items.reduce(
            (total, item) =>
                total +
                Number(item.volume || 0) *
                Number(item.quantity || 1),
            0
        );

        const dismantleItems = sanitizeAddOnItems(
            body.dismantleItems || []
        );

        const assemblyItems = sanitizeAddOnItems(
            body.assemblyItems || []
        );

        const dismantleCount = dismantleItems.length
            ? getItemsCount(dismantleItems)
            : Math.max(0, Number(body.dismantleCount) || 0);

        const assemblyCount = assemblyItems.length
            ? getItemsCount(assemblyItems)
            : Math.max(0, Number(body.assemblyCount) || 0);

        const helperCount = Number(body.helperCount) > 0 ? 1 : 0;

        const pricingData = {
            distance: Math.max(0, Number(body.distance) || 0),
            volume: totalVolume,
            pickupFloor: body.pickupFloor || {},
            deliveryFloor: body.deliveryFloor || {},
            helperCount,
            dismantleCount,
            assemblyCount,
            packingService: Boolean(body.packingService),
            dateType: body.dateType || "specific",
            date: body.date || "",
            timeSlot: body.timeSlot || ""
        };

        const totalPrice = calculateTotalPrice(pricingData);
        const { breakdown } = getPriceBreakdown(pricingData);

        const reference = await generateBookingReference();

        const booking = await Booking.create({
            bookingRef: reference.bookingRef,
            bookingSequence: reference.bookingSequence,
            serviceType: body.serviceType,
            pickup: body.pickup || {},
            delivery: body.delivery || {},
            pickupFloor: body.pickupFloor || {},
            deliveryFloor: body.deliveryFloor || {},
            items,
            totalVolume,
            dateType: body.dateType || "specific",
            date: body.date || "",
            timeSlot: body.timeSlot || "",
            helperCount,
            dismantleItems,
            assemblyItems,
            dismantleCount,
            assemblyCount,
            packingService: Boolean(body.packingService),
            specialInstructions,
            distance: pricingData.distance,
            totalPrice,
            priceBreakdown: breakdown,
            customer: body.customer || {},
            status: "pending"
        });

        return res.status(201).json({
            success: true,
            data: booking,
            bookingRef: booking.bookingRef
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};
// ── GET /api/bookings ───────────────────────────────────────────────────────
const getAllBookings = async (req, res) => {
    try {
        const { status, serviceType, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (status) filter.status = status;
        if (serviceType) filter.serviceType = serviceType;

        const bookings = await Booking.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await Booking.countDocuments(filter);

        res.json({ success: true, data: bookings, total, page: Number(page), pages: Math.ceil(total / limit) });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── GET /api/bookings/:id ───────────────────────────────────────────────────
const getBooking = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ success: false, message: "Booking not found." });
        res.json({ success: true, data: booking });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── GET /api/bookings/ref/:bookingRef ───────────────────────────────────────
const getBookingByRef = async (req, res) => {
    try {
        const booking = await Booking.findOne({ bookingRef: req.params.bookingRef });
        if (!booking) return res.status(404).json({ success: false, message: "Booking not found." });
        res.json({ success: true, data: booking });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── PATCH /api/bookings/:id/status ─────────────────────────────────────────
const updateBookingStatus = async (req, res) => {
    try {
        const { status, adminNotes } = req.body;
        const allowed = ["pending", "confirmed", "in_progress", "completed", "cancelled"];
        if (!allowed.includes(status))
            return res.status(400).json({ success: false, message: "Invalid status." });

        const booking = await Booking.findByIdAndUpdate(
            req.params.id,
            { status, ...(adminNotes !== undefined && { adminNotes }) },
            { returnDocument: "after" }
        );
        if (!booking) return res.status(404).json({ success: false, message: "Booking not found." });

        res.json({ success: true, data: booking });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
///update booking.................
const updateBooking = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found."
            });
        }

        if (!["pending", "in_progress"].includes(booking.status)) {
            return res.status(400).json({
                success: false,
                message: "Only pending or in-progress bookings can be edited."
            });
        }

        const body = req.body;
        const postcodeRegex = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i;

        const pickup = {
            ...(booking.pickup?.toObject?.() || booking.pickup || {}),
            ...(body.pickup || {})
        };

        const delivery = {
            ...(booking.delivery?.toObject?.() || booking.delivery || {}),
            ...(body.delivery || {})
        };

        if (!postcodeRegex.test((pickup.postcode || "").trim())) {
            return res.status(400).json({
                success: false,
                message: "Invalid pickup postcode."
            });
        }

        if (!postcodeRegex.test((delivery.postcode || "").trim())) {
            return res.status(400).json({
                success: false,
                message: "Invalid delivery postcode."
            });
        }

        const items = Array.isArray(body.items)
            ? sanitizeItems(body.items)
            : sanitizeItems(
                booking.items.map(item => item.toObject?.() || item)
            );

        if (items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one item is required."
            });
        }

        const specialInstructions =
            body.specialInstructions !== undefined
                ? String(body.specialInstructions)
                : booking.specialInstructions || "";

        if (specialInstructions.length > 450) {
            return res.status(400).json({
                success: false,
                message: "Special instructions cannot exceed 450 characters."
            });
        }

        const totalVolume = items.reduce(
            (total, item) =>
                total +
                Number(item.volume || 0) *
                Number(item.quantity || 1),
            0
        );

        const pickupFloor = {
            ...(
                booking.pickupFloor?.toObject?.() ||
                booking.pickupFloor ||
                {}
            ),
            ...(body.pickupFloor || {})
        };

        const deliveryFloor = {
            ...(
                booking.deliveryFloor?.toObject?.() ||
                booking.deliveryFloor ||
                {}
            ),
            ...(body.deliveryFloor || {})
        };

        const dismantleItems = Array.isArray(body.dismantleItems)
            ? sanitizeAddOnItems(body.dismantleItems)
            : sanitizeAddOnItems(
                booking.dismantleItems?.map(
                    item => item.toObject?.() || item
                ) || []
            );

        const assemblyItems = Array.isArray(body.assemblyItems)
            ? sanitizeAddOnItems(body.assemblyItems)
            : sanitizeAddOnItems(
                booking.assemblyItems?.map(
                    item => item.toObject?.() || item
                ) || []
            );

        const dismantleCount = Array.isArray(body.dismantleItems)
            ? getItemsCount(dismantleItems)
            : body.dismantleCount !== undefined
                ? Math.max(0, Number(body.dismantleCount) || 0)
                : Number(booking.dismantleCount) || 0;

        const assemblyCount = Array.isArray(body.assemblyItems)
            ? getItemsCount(assemblyItems)
            : body.assemblyCount !== undefined
                ? Math.max(0, Number(body.assemblyCount) || 0)
                : Number(booking.assemblyCount) || 0;

        const helperCount =
            body.helperCount !== undefined
                ? Number(body.helperCount) > 0 ? 1 : 0
                : Number(booking.helperCount) > 0 ? 1 : 0;

        const pricingData = {
            distance:
                body.distance !== undefined
                    ? Math.max(0, Number(body.distance) || 0)
                    : Math.max(0, Number(booking.distance) || 0),

            volume: totalVolume,

            pickupFloor,
            deliveryFloor,
            helperCount,
            dismantleCount,
            assemblyCount,

            packingService:
                body.packingService !== undefined
                    ? Boolean(body.packingService)
                    : Boolean(booking.packingService),

            dateType: body.dateType || booking.dateType,

            date:
                body.date !== undefined
                    ? body.date
                    : booking.date,

            timeSlot:
                body.timeSlot !== undefined
                    ? body.timeSlot
                    : booking.timeSlot
        };

        const totalPrice = calculateTotalPrice(pricingData);
        const { breakdown } = getPriceBreakdown(pricingData);

        booking.serviceType =
            body.serviceType || booking.serviceType;
        booking.pickup = pickup;
        booking.delivery = delivery;
        booking.pickupFloor = pickupFloor;
        booking.deliveryFloor = deliveryFloor;
        booking.items = items;
        booking.totalVolume = totalVolume;
        booking.distance = pricingData.distance;
        booking.dateType = pricingData.dateType;
        booking.date = pricingData.date;
        booking.timeSlot = pricingData.timeSlot;
        booking.helperCount = helperCount;
        booking.dismantleItems = dismantleItems;
        booking.assemblyItems = assemblyItems;
        booking.dismantleCount = dismantleCount;
        booking.assemblyCount = assemblyCount;
        booking.packingService = pricingData.packingService;
        booking.specialInstructions = specialInstructions;
        booking.totalPrice = totalPrice;
        booking.priceBreakdown = breakdown;

        if (body.customer) {
            booking.customer = {
                ...(booking.customer?.toObject?.() || booking.customer || {}),
                ...body.customer
            };
        }

        await booking.save();

        return res.json({
            success: true,
            data: booking
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// ── DELETE /api/bookings/:id ────────────────────────────────────────────────
const deleteBooking = async (req, res) => {
    try {
        const booking = await Booking.findByIdAndDelete(req.params.id);
        if (!booking) return res.status(404).json({ success: false, message: "Booking not found." });
        res.json({ success: true, message: "Booking deleted." });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// GET /api/bookings/invoices
const getInvoiceBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({
            status: { $in: ["pending", "in_progress", "completed"] }
        }).sort({ createdAt: -1 });
        res.json({
            success: true,
            data: bookings
        });
    } catch (err) {
        console.error("Get invoice bookings error:", err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};
// PATCH /api/bookings/:id/price

const updateBookingPrice = async (req, res) => {
    try {
        const finalPrice = Number(req.body.finalPrice);
        const discount = Math.max(
            0,
            Number(req.body.discount) || 0
        );
        const tax = Math.max(
            0,
            Number(req.body.tax) || 0
        );
        const invoiceNotes = String(
            req.body.notes || ""
        ).trim();

        if (!Number.isFinite(finalPrice) || finalPrice < 0) {
            return res.status(400).json({
                success: false,
                message: "Valid final price is required."
            });
        }

        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found."
            });
        }

        booking.totalPrice =
            Math.round(finalPrice * 100) / 100;

        booking.discount =
            Math.round(discount * 100) / 100;

        booking.tax =
            Math.round(tax * 100) / 100;

        booking.invoiceNotes = invoiceNotes;

        await booking.save();

        const updatedBooking = await Booking.findById(
            booking._id
        ).lean();

        return res.json({
            success: true,
            message: "Booking price updated successfully.",
            data: updatedBooking
        });
    } catch (err) {
        console.error("Update booking price error:", err);

        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// POST /api/bookings/:id/send-invoice

const sendInvoice = async (req, res) => {

    try {

        const {
            method,
            notes,
            attachment
        } = req.body;


        const booking = await Booking.findById(req.params.id);


        if (!booking) {

            return res.status(404).json({
                success: false,
                message: "Booking not found"
            });

        }



        // EMAIL
        if (method === "email") {


            if (!booking.customer?.email) {

                return res.status(400).json({
                    success: false,
                    message: "Customer email missing"
                });

            }


            const html = `
            <p>Hello ${booking.customer?.name || "Customer"},</p>
            <p>
            Please find your Khan Moves invoice attached.
            </p>
            <p>
            Booking Ref:
            <strong>${booking.bookingRef}</strong>
            </p>
            ${notes ? `<p>${notes}</p>` : ""}
            <p>
            Thank you for choosing Khan Moves.
            </p>
            `;
            const attachments = attachment ? [
                {
                    filename: attachment.filename,
                    content: Buffer.from(
                        attachment.content,
                        "base64"
                    )
                }
            ] : [];



            const sent = await sendEmail(
                booking.customer.email,
                `Khan Moves Invoice - ${booking.bookingRef}`,
                html,
                attachments
            );


            if (!sent) {

                return res.status(500).json({
                    success: false,
                    message: "Email failed"
                });

            }
            return res.json({
                success: true,
                message: "Invoice sent by email"
            });


        }

        // WHATSAPP

        if (method === "whatsapp") {


            const phone =
                (
                    booking.customer?.whatsapp ||
                    booking.customer?.phone ||
                    ""
                )
                    .replace(/\D/g, "");



            if (!phone) {

                return res.status(400).json({
                    success: false,
                    message: "Phone number missing"
                });

            }


            const message = `Hello ${booking.customer?.name || "Customer"},
Your Khan Moves invoice is ready.

Booking Ref: ${booking.bookingRef}
Amount: £${booking.totalPrice}

${notes ? notes + "\n\n" : ""}Payment Details:
Bank Name: Khan Moves Limited
Account Name: Khan Moves Limited
Sort Code: 20-08-64
Account Number: 13519252

Thank you for choosing Khan Moves.`;

            if (attachment?.content) {

                await sendWhatsAppDocument(
                    phone,
                    attachment.content,
                    attachment.filename || "invoice.pdf",
                    message
                );

            } else {

                await sendWhatsApp(
                    phone,
                    message
                );


            }

            return res.json({
                success: true,
                message: "Invoice sent on WhatsApp"
            });


        }

        return res.status(400).json({
            success: false,
            message: "Invalid method"
        });

    } catch (err) {

        res.status(500).json({
            success: false,
            message: err.message
        });


    }

};
module.exports = {
    createBooking,
    getAllBookings,
    getBooking,
    getBookingByRef,
    updateBookingStatus,
    updateBooking,
    deleteBooking,
    getInvoiceBookings,
    updateBookingPrice,
    sendInvoice
};