const Booking = require("../models/Booking");
const sendEmail = require("../utils/sendEmail");
const { sendWhatsApp, sendWhatsAppDocument } = require("../utils/sendWhatsApp");

// ── Price calculator (same logic as frontend) ──────────────────────────────
const getVolumeCharge = (vol) => {
    if (vol <= 0) return 0;
    let charge = 0;
    const units = vol / 0.1;
    const t1 = Math.min(units, 30);
    charge += t1 * 0.90;
    if (units <= 30) return charge;
    const t2 = Math.min(units - 30, 40);
    charge += t2 * 1.10;
    if (units <= 70) return charge;
    const t3 = Math.min(units - 70, 50);
    charge += t3 * 1.30;
    if (units <= 120) return charge;
    charge += (units - 120) * 1.80;
    return charge;
};

const getFloorCharge = (floorLevel, hasLift, vol) => {
    if (!floorLevel || floorLevel === "ground") return 0;
    if (floorLevel === "basement") return 5 * vol;
    const floorMap = { "1st": 1, "2nd": 2, "3rd": 3, "4th+": 4 };
    const f = floorMap[floorLevel] || 0;
    if (f === 0) return 0;
    return (hasLift ? 2 : 5) * f * vol;
};

const calculatePrice = (data) => {
    const vol = data.totalVolume || 0;
    const dist = data.distance || 0;

    let total = 30; // base fee
    total += dist * 1.5;
    total += getVolumeCharge(vol);
    total += getFloorCharge(data.pickupFloor?.floorLevel, data.pickupFloor?.hasLift, vol);
    total += getFloorCharge(data.deliveryFloor?.floorLevel, data.deliveryFloor?.hasLift, vol);
    total += (data.pickupFloor?.hasParking ?? true) ? 0 : 5;
    total += (data.deliveryFloor?.hasParking ?? true) ? 0 : 5;
    if (data.helperCount > 0) total += data.helperCount * 50;
    if (data.dismantleCount > 0) total += data.dismantleCount * 20;
    if (data.assemblyCount > 0) total += data.assemblyCount * 30;
    if (data.packingService) total += 49;
    if (data.timeSlot === "afternoon") total += 10;
    if (data.dateType === "flexible") total = total * 0.8;

    return Math.round(total);
};

// ── POST /api/bookings ──────────────────────────────────────────────────────
const createBooking = async (req, res) => {
    try {
        const body = req.body;

        // Calculate volume
        const totalVolume = (body.items || []).reduce(
            (s, it) => s + (it.volume || 0) * (it.quantity || 1), 0
        );

        // Server-side price calculation (don't trust client price)
        const dataForPrice = { ...body, totalVolume };
        const totalPrice = calculatePrice(dataForPrice);

        const booking = await Booking.create({
            serviceType: body.serviceType,
            pickup: body.pickup || {},
            delivery: body.delivery || {},
            pickupFloor: body.pickupFloor || {},
            deliveryFloor: body.deliveryFloor || {},
            items: body.items || [],
            totalVolume,
            dateType: body.dateType || "specific",
            date: body.date || "",
            timeSlot: body.timeSlot || "",
            helperCount: body.helperCount || 0,
            dismantleCount: body.dismantleCount || 0,
            assemblyCount: body.assemblyCount || 0,
            packingService: body.packingService || false,
            specialInstructions: body.specialInstructions || "",
            distance: body.distance || 0,
            totalPrice,
            customer: body.customer || {},
            status: "pending",
        });

        res.status(201).json({
            success: true,
            data: booking,
            bookingRef: booking.bookingRef,
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
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
            ? body.items
                .filter((item) => item?.name && Number(item.quantity || 0) > 0)
                .map((item) => ({
                    name: String(item.name).trim(),
                    volume: Number(item.volume || 0),
                    quantity: Number(item.quantity || 1),
                    custom: Boolean(item.custom)
                }))
            : booking.items;

        if (!items.length) {
            return res.status(400).json({
                success: false,
                message: "At least one item is required."
            });
        }

        const totalVolume = items.reduce(
            (sum, item) =>
                sum +
                Number(item.volume || 0) *
                Number(item.quantity || 1),
            0
        );

        const pickupFloor = {
            ...(booking.pickupFloor?.toObject?.() ||
                booking.pickupFloor ||
                {}),
            ...(body.pickupFloor || {})
        };

        const deliveryFloor = {
            ...(booking.deliveryFloor?.toObject?.() ||
                booking.deliveryFloor ||
                {}),
            ...(body.deliveryFloor || {})
        };

        const pricingData = {
            totalVolume,
            distance:
                body.distance !== undefined
                    ? Number(body.distance || 0)
                    : Number(booking.distance || 0),
            pickupFloor,
            deliveryFloor,
            helperCount:
                body.helperCount !== undefined
                    ? Number(body.helperCount || 0)
                    : Number(booking.helperCount || 0),
            dismantleCount:
                body.dismantleCount !== undefined
                    ? Number(body.dismantleCount || 0)
                    : Number(booking.dismantleCount || 0),
            assemblyCount:
                body.assemblyCount !== undefined
                    ? Number(body.assemblyCount || 0)
                    : Number(booking.assemblyCount || 0),
            packingService:
                body.packingService !== undefined
                    ? Boolean(body.packingService)
                    : Boolean(booking.packingService),
            dateType: body.dateType || booking.dateType,
            timeSlot:
                body.timeSlot !== undefined
                    ? body.timeSlot
                    : booking.timeSlot
        };

        booking.pickup = pickup;
        booking.delivery = delivery;
        booking.pickupFloor = pickupFloor;
        booking.deliveryFloor = deliveryFloor;
        booking.items = items;
        booking.totalVolume = totalVolume;
        booking.distance = pricingData.distance;
        booking.dateType = pricingData.dateType;
        booking.date =
            body.date !== undefined ? body.date : booking.date;
        booking.timeSlot = pricingData.timeSlot;
        booking.helperCount = pricingData.helperCount;
        booking.dismantleCount = pricingData.dismantleCount;
        booking.assemblyCount = pricingData.assemblyCount;
        booking.packingService = pricingData.packingService;
        booking.specialInstructions =
            body.specialInstructions !== undefined
                ? body.specialInstructions
                : booking.specialInstructions;
        booking.totalPrice = calculatePrice(pricingData);

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
        const { finalPrice, discount = 0, tax = 0 } = req.body;

        const booking = await Booking.findByIdAndUpdate(
            req.params.id,
            {
                totalPrice: finalPrice,
                discount,
                tax
            },
            {
                returnDocument: "after"
            }
        );

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found"
            });
        }

        res.json({
            success: true,
            data: booking
        });

    } catch (err) {
        res.status(500).json({
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