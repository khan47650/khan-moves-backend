const Job = require("../models/Job");
const Booking = require("../models/Booking");
const Driver = require("../models/Driver");
const Vehicle = require("../models/Vehicle");
const sendEmail = require("../utils/sendEmail");
const { sendWhatsApp } = require("../utils/sendWhatsApp");
const {
    calculatePricing
} = require("../utils/bookingPriceCalculator");
const Service = require("../models/Service");


const releaseJobResources = async job => {
    const tasks = [];

    if (job.assignedDriver) {
        tasks.push(
            Driver.findByIdAndUpdate(
                job.assignedDriver,
                {
                    assignedNow: "None"
                }
            )
        );
    }

    if (job.assignedVehicle) {
        tasks.push(
            Vehicle.findByIdAndUpdate(
                job.assignedVehicle,
                {
                    assignedDriver: ""
                }
            )
        );
    }

    await Promise.all(tasks);
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

const getServiceLabel = async serviceSlug => {
    if (!serviceSlug) return "Service";

    const service = await Service.findOne({
        slug: serviceSlug
    }).select("label");

    return service?.label || serviceSlug;
};

const timeSlotMap = {
    early: "6:00 AM – 6:00 PM",

    morning: "8:00 AM – 6:00 PM",

    nine_to_five: "9:00 AM – 5:00 PM",
    nineToFive: "9:00 AM – 5:00 PM",

    afternoon: "9:00 AM – 4:00 PM",

    flexible: "I'm flexible with timing"
};

const formatTimeSlot = value => {
    return timeSlotMap[value] || value || "TBC";
};

// ── POST /api/jobs/from-booking/:bookingId 
const createJobFromBooking = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.bookingId);
        if (!booking) return res.status(404).json({ success: false, message: "Booking not found." });

        // Check job not already created
        const existing = await Job.findOne({ booking: booking._id });
        if (existing) return res.status(409).json({ success: false, message: "Job already exists for this booking." });

        // console.log("BOOKING BREAKDOWN");
        // console.log(booking.priceBreakdown);
        const job = await Job.create({
            booking: booking._id,
            bookingRef: booking.bookingRef,
            serviceType: booking.serviceType,
            customer: booking.customer,
            pickup: booking.pickup,
            delivery: booking.delivery,
            pickupFloor: booking.pickupFloor,
            deliveryFloor: booking.deliveryFloor,
            items: booking.items,
            totalVolume: booking.totalVolume,

            date: booking.date,
            dateType: booking.dateType,
            timeSlot: booking.timeSlot,

            distance: Number(booking.distance) || 0,

            estimatedDeliveryTime: String(
                booking.estimatedDeliveryTime || ""
            ).trim(),

            totalPrice: booking.totalPrice,

            adminPrice: booking.adminPrice ?? null,

            priceBreakdown: booking.priceBreakdown || [],

            pricingStatus: booking.pricingStatus || "",

            pricingNote: booking.pricingNote || "",

            helperCount: booking.helperCount || 0,

            dismantleCount: booking.dismantleCount || 0,

            assemblyCount: booking.assemblyCount || 0,

            packingService: booking.packingService || false,

            specialInstructions: booking.specialInstructions,

            status: "active",

            statusHistory: [
                {
                    status: "active",
                    reason: "Job created from confirmed booking"
                }
            ]
        });

        // Update booking status to confirmed
        await Booking.findByIdAndUpdate(booking._id, { status: "confirmed" });

        // Send confirmation email to customer
        if (booking.customer?.email) {
            const svcLabel =
                await getServiceLabel(
                    booking.serviceType
                );
            const html = `
            <!DOCTYPE html><html><head><meta charset="UTF-8"></head>
            <body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f5f5f5">
            <div style="max-width:600px;margin:0 auto;background:#fff">
                <div style="height:5px;background:#C0392B"></div>
              <div style="background:#C0392B;padding:24px 32px;display:flex;align-items:center;justify-content:space-between">
                    <div>
                        <div style="color:#fff;font-size:20px;font-weight:700;font-family:Arial,sans-serif">KHAN MOVES</div>
                        <div style="color:#ffcccc;font-size:11px;font-family:Arial,sans-serif;margin-top:2px">Professional Removals UK</div>
                    </div>
                    <div style="color:#fff;font-size:13px;font-family:Arial,sans-serif;font-weight:700">${booking.bookingRef}</div>
                </div>
                <div style="padding:28px 32px">
                    <div style="background:#d4edda;border:1px solid #c3e6cb;border-radius:8px;padding:16px 20px;margin-bottom:24px;text-align:center">
                        <div style="font-size:28px;margin-bottom:8px">✅</div>
                        <div style="font-size:18px;font-weight:700;color:#155724;font-family:Arial,sans-serif">Booking Confirmed!</div>
                    </div>
                    <h2 style="color:#1a1a1a;font-size:18px;margin-bottom:8px;font-family:Arial,sans-serif">Hello ${booking.customer?.name || "Customer"},</h2>
                    <p style="color:#555;font-size:13px;line-height:1.6;margin-bottom:20px;font-family:Arial,sans-serif">
                        Great news! Your booking with Khan Moves has been <strong>confirmed</strong>. Our team will be there on the scheduled date to make your move smooth and stress-free.
                    </p>
                    <div style="background:#f7f7f7;border-radius:8px;padding:16px 20px;margin-bottom:20px">
                        <table style="width:100%;border-collapse:collapse">
                            <tr><td style="font-size:11px;color:#888;padding-bottom:5px;width:110px;font-family:Arial,sans-serif">Booking Ref</td><td style="font-size:11px;color:#1a1a1a;font-weight:600;padding-bottom:5px;font-family:Arial,sans-serif">${booking.bookingRef}</td></tr>
                            <tr><td style="font-size:11px;color:#888;padding-bottom:5px;font-family:Arial,sans-serif">Service</td><td style="font-size:11px;color:#1a1a1a;font-weight:600;padding-bottom:5px;font-family:Arial,sans-serif">${svcLabel}</td></tr>
                            <tr><td style="font-size:11px;color:#888;padding-bottom:5px;font-family:Arial,sans-serif">Move Date</td><td style="font-size:11px;color:#1a1a1a;font-weight:600;padding-bottom:5px;font-family:Arial,sans-serif">${booking.dateType === "flexible" ? "Flexible dates" : booking.date || "—"}</td></tr>
                            <tr><td style="font-size:11px;color:#888;padding-bottom:5px;font-family:Arial,sans-serif">Time Slot</td><td style="font-size:11px;color:#1a1a1a;font-weight:600;padding-bottom:5px;font-family:Arial,sans-serif;text-transform:capitalize">${booking.dateType === "flexible"
                    ? "I'm flexible with timing"
                    : formatTimeSlot(booking.timeSlot)}</td></tr>
                            <tr><td style="font-size:11px;color:#888;font-family:Arial,sans-serif">Total Price</td><td style="font-size:11px;color:#C0392B;font-weight:700;font-family:Arial,sans-serif">£${(booking.totalPrice || 0).toFixed(2)}</td></tr>
                        </table>
                    </div>
                    <div style="background:#f7f7f7;border-radius:8px;padding:16px 20px;margin-bottom:20px">
                        <p style="font-size:10px;color:#999;font-weight:700;text-transform:uppercase;margin-bottom:8px;font-family:Arial,sans-serif">Route</p>
                        <p style="font-size:12px;font-weight:700;color:#C0392B;margin-bottom:2px;font-family:Arial,sans-serif">Pickup</p>
                        <p style="font-size:12px;color:#1a1a1a;margin-bottom:10px;font-family:Arial,sans-serif">${booking.pickup?.address || "—"}, ${booking.pickup?.postcode || ""}</p>
                        <p style="font-size:12px;font-weight:700;color:#27AE60;margin-bottom:2px;font-family:Arial,sans-serif">Delivery</p>
                        <p style="font-size:12px;color:#1a1a1a;font-family:Arial,sans-serif">${booking.delivery?.address || "—"}, ${booking.delivery?.postcode || ""}</p>
                    </div>
                    <p style="font-size:13px;color:#555;line-height:1.6;font-family:Arial,sans-serif">
                        If you have any questions, please contact us at <a href="mailto:info@khanmoves.co.uk" style="color:#C0392B">info@khanmoves.co.uk</a> or call <strong>07700 000000</strong>.
                    </p>
                </div>
                <div style="height:4px;background:#C0392B"></div>
            </div>
            </body></html>`;

            await sendEmail(booking.customer.email, `Booking Confirmed - ${booking.bookingRef}`, html);
        }

        res.status(201).json({ success: true, data: job });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};


const updateJob = async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);

        if (!job) {
            return res.status(404).json({
                success: false,
                message: "Job not found."
            });
        }

        const body = req.body;
        const postcodeRegex = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i;

        const pickup = {
            ...(job.pickup?.toObject?.() || job.pickup || {}),
            ...(body.pickup || {})
        };

        const delivery = {
            ...(job.delivery?.toObject?.() || job.delivery || {}),
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
                job.items.map(item => item.toObject?.() || item)
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
                : job.specialInstructions || "";

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
                job.pickupFloor?.toObject?.() ||
                job.pickupFloor ||
                {}
            ),
            ...(body.pickupFloor || {})
        };

        const deliveryFloor = {
            ...(
                job.deliveryFloor?.toObject?.() ||
                job.deliveryFloor ||
                {}
            ),
            ...(body.deliveryFloor || {})
        };

        const dismantleCount =
            body.dismantleCount !== undefined
                ? Math.max(0, Number(body.dismantleCount) || 0)
                : Number(job.dismantleCount) || 0;

        const assemblyCount =
            body.assemblyCount !== undefined
                ? Math.max(0, Number(body.assemblyCount) || 0)
                : Number(job.assemblyCount) || 0;

        const helperCount =
            body.helperCount !== undefined
                ? Number(body.helperCount) > 0 ? 1 : 0
                : Number(job.helperCount) > 0 ? 1 : 0;

        const pricingData = {
            distance:
                body.distance !== undefined
                    ? Math.max(0, Number(body.distance) || 0)
                    : Math.max(0, Number(job.distance) || 0),

            volume: totalVolume,

            pickupFloor,
            deliveryFloor,
            helperCount,
            dismantleCount,
            assemblyCount,

            packingService:
                body.packingService !== undefined
                    ? Boolean(body.packingService)
                    : Boolean(job.packingService),

            dateType: body.dateType || job.dateType,

            date:
                body.date !== undefined
                    ? body.date
                    : job.date,

            timeSlot:
                body.timeSlot !== undefined
                    ? body.timeSlot
                    : job.timeSlot
        };

        const estimatedDeliveryTime =
            body.estimatedDeliveryTime !== undefined
                ? String(
                    body.estimatedDeliveryTime || ""
                ).trim()
                : job.estimatedDeliveryTime || "";

        const pricingResult =
            calculatePricing(pricingData);

        const originalPrice =
            pricingResult.total;

        const adminPrice =
            body.totalPrice !== undefined
                ? Number(body.totalPrice)
                : job.adminPrice;

        const totalPrice =
            adminPrice ?? originalPrice;

        const breakdown =
            pricingResult.breakdown;

        job.serviceType =
            body.serviceType || job.serviceType;
        job.pickup = pickup;
        job.delivery = delivery;
        job.pickupFloor = pickupFloor;
        job.deliveryFloor = deliveryFloor;
        job.items = items;
        job.totalVolume = totalVolume;
        job.distance = pricingData.distance;
        job.estimatedDeliveryTime =
            estimatedDeliveryTime;

        job.dateType = pricingData.dateType;
        job.date = pricingData.date;
        job.timeSlot = pricingData.timeSlot;
        job.helperCount = helperCount;
        job.dismantleCount = dismantleCount;
        job.assemblyCount = assemblyCount;
        job.packingService = pricingData.packingService;
        job.specialInstructions = specialInstructions;
        job.totalPrice =
            totalPrice;
        job.originalPrice =
            originalPrice;

        job.adminPrice =
            adminPrice;

        job.priceBreakdown =
            breakdown;

        job.pricingStatus =
            pricingResult.pricingStatus;

        job.pricingNote =
            body.totalPrice !== undefined
                ? `Admin price override. System calculated: £${pricingResult.total}`
                : (pricingResult.note || "");

        if (body.customer) {
            job.customer = {
                ...(job.customer?.toObject?.() || job.customer || {}),
                ...body.customer
            };
        }

        await job.save();

        return res.json({
            success: true,
            data: job
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// ── POST /api/jobs/reject-booking/:bookingId ──────────
const rejectBooking = async (req, res) => {
    try {
        const { reason } = req.body;
        if (!reason?.trim()) return res.status(400).json({ success: false, message: "Reason is required." });

        const booking = await Booking.findById(req.params.bookingId);
        if (!booking) return res.status(404).json({ success: false, message: "Booking not found." });

        await Booking.findByIdAndUpdate(booking._id, { status: "cancelled" });

        if (booking.customer?.email) {
            const html = `
            <!DOCTYPE html><html><head><meta charset="UTF-8"></head>
            <body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f5f5f5">
            <div style="max-width:600px;margin:0 auto;background:#fff">
                <div style="height:5px;background:#C0392B"></div>
                <div style="background:#1a1a1a;padding:24px 32px">
                    <div style="color:#F1C40F;font-size:20px;font-weight:700;font-family:Arial,sans-serif">KHAN MOVES</div>
                    <div style="color:#aaa;font-size:11px;font-family:Arial,sans-serif;margin-top:2px">Professional Removals UK</div>
                </div>
                <div style="padding:28px 32px">
                    <h2 style="color:#1a1a1a;font-size:18px;margin-bottom:8px;font-family:Arial,sans-serif">Hello ${booking.customer?.name || "Customer"},</h2>
                    <p style="color:#555;font-size:13px;line-height:1.6;margin-bottom:20px;font-family:Arial,sans-serif">
                        We regret to inform you that we are unable to accept your booking request <strong>${booking.bookingRef}</strong> at this time.
                    </p>
                    <div style="background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:16px 20px;margin-bottom:20px">
                        <p style="font-size:10px;color:#856404;font-weight:700;text-transform:uppercase;margin-bottom:6px;font-family:Arial,sans-serif">Reason</p>
                        <p style="font-size:13px;color:#333;line-height:1.6;font-family:Arial,sans-serif">${reason}</p>
                    </div>
                    <p style="font-size:13px;color:#555;line-height:1.6;font-family:Arial,sans-serif">
                        We apologise for any inconvenience. Please feel free to submit a new booking or contact us at <a href="mailto:info@khanmoves.co.uk" style="color:#C0392B">info@khanmoves.co.uk</a> or call <strong>07700 000000</strong>.
                    </p>
                </div>
                <div style="background:#1a1a1a;padding:14px 32px">
                    <div style="color:#888;font-size:10px;font-family:Arial,sans-serif">Khan Moves · Professional Removals UK</div>
                </div>
                <div style="height:4px;background:#C0392B"></div>
            </div>
            </body></html>`;

            await sendEmail(booking.customer.email, `Booking Update - ${booking.bookingRef}`, html);
        }

        res.json({ success: true, message: "Booking rejected and email sent." });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── GET /api/jobs ──────────────────────────────────────────────────────────
const getAllJobs = async (req, res) => {
    try {
        const { status } = req.query;
        const filter = {};
        if (status) filter.status = status;
        const jobs = await Job.find(filter)
            .populate("assignedDriver", "name phone")
            .populate("assignedVehicle", "regNumber makeModel")
            .sort({ createdAt: -1 });
        res.json({ success: true, data: jobs });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── GET /api/jobs/:id ──────────────────────────────────────────────────────
const getJob = async (req, res) => {
    try {
        const job = await Job.findById(req.params.id)
            .populate("assignedDriver", "name phone")
            .populate("assignedVehicle", "regNumber makeModel");
        if (!job) return res.status(404).json({ success: false, message: "Job not found." });
        res.json({ success: true, data: job });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── PATCH /api/jobs/:id/status ───────────────
const updateJobStatus = async (req, res) => {
    try {
        const { status } = req.body;

        const allowed = [
            "active",
            "on_way",
            "completed"
        ];

        if (!allowed.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid job status."
            });
        }

        const job = await Job.findById(req.params.id);

        if (!job) {
            return res.status(404).json({
                success: false,
                message: "Job not found."
            });
        }

        const previousStatus = job.status;

        if (status === "completed" && previousStatus !== "completed") {
            job.completedAt = new Date();

            await releaseJobResources(job);

            if (job.assignedDriver) {
                await Driver.findByIdAndUpdate(
                    job.assignedDriver,
                    {
                        $inc: {
                            totalJobs: 1
                        },
                        $addToSet: {
                            completedJobs: job._id
                        }
                    }
                );
            }

            await Booking.findByIdAndUpdate(
                job.booking,
                {
                    status: "completed"
                }
            );
        }

        if (status === "on_way") {
            await Booking.findByIdAndUpdate(
                job.booking,
                {
                    status: "in_progress"
                }
            );
        }

        job.status = status;

        job.statusHistory.push({
            status,
            reason: `Changed from ${previousStatus}`
        });

        await job.save();

        return res.json({
            success: true,
            data: job
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

const cancelJob = async (req, res) => {
    try {
        const reason = String(
            req.body.reason || ""
        ).trim();

        if (reason.length < 5) {
            return res.status(400).json({
                success: false,
                message: "Please provide a clear cancellation reason."
            });
        }

        const job = await Job.findById(
            req.params.id
        );

        if (!job) {
            return res.status(404).json({
                success: false,
                message: "Job not found."
            });
        }

        if (
            !["active", "on_way"].includes(
                job.status
            )
        ) {
            return res.status(400).json({
                success: false,
                message: "Only active or on-way jobs can be cancelled."
            });
        }

        const assignedDriver = job.assignedDriver
            ? await Driver.findById(
                job.assignedDriver
            ).select("name phone")
            : null;

        const assignedVehicleLabel =
            job.assignedVehicleReg ||
            "Not assigned";

        await releaseJobResources(job);

        job.assignedDriver = null;
        job.assignedDriverName = "";

        job.assignedVehicle = null;
        job.assignedVehicleReg = "";

        job.status = "cancelled";
        job.cancelReason = reason;
        job.cancelledAt = new Date();

        job.statusHistory.push({
            status: "cancelled",
            reason
        });

        await job.save();

        await Booking.findByIdAndUpdate(
            job.booking,
            {
                status: "cancelled",
                adminNotes: reason
            }
        );

        const serviceLabel =
            await getServiceLabel(
                job.serviceType
            );
        if (assignedDriver?.phone) {

            const cancellationMessage =
                `Hello ${assignedDriver.name},\n\n` +
                `⚠️ *JOB CANCELLED*\n\n` +
                `The following assigned job has been cancelled:\n\n` +
                `*Job Ref:* ${job.bookingRef}\n` +
                `*Service:* ${serviceLabel}\n` +
                `*Date:* ${job.dateType === "flexible"
                    ? "Flexible"
                    : job.date || "—"
                }\n` +
                `*Time Slot:* ${job.dateType === "flexible"
                    ? "Flexible Timing"
                    : formatTimeSlot(job.timeSlot)
                }\n` +
                `*Assigned Vehicle:* ${assignedVehicleLabel}\n\n` +
                `*Cancellation Reason:*\n${reason}\n\n` +
                `You are no longer assigned to this job.\n\n` +
                `— Khan Moves`;

            try {
                await sendWhatsApp(
                    assignedDriver.phone,
                    cancellationMessage
                );
            } catch (whatsappError) {
                console.error(
                    "Driver cancellation WhatsApp failed:",
                    whatsappError.message
                );
            }
        }

        if (job.customer?.email) {
            const cancellationEmail = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
    </head>

    <body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f5f5f5">
        <div style="max-width:600px;margin:0 auto;background:#ffffff">
            <div style="height:5px;background:#C0392B"></div>

            <div style="background:#C0392B;padding:24px 32px">
                <div style="color:#ffffff;font-size:20px;font-weight:700">
                    KHAN MOVES
                </div>

                <div style="margin-top:3px;color:#ffcccc;font-size:11px">
                    Professional Removals UK
                </div>
            </div>

            <div style="padding:28px 32px">
                <div style="margin-bottom:24px;border:1px solid #fecaca;border-radius:8px;background:#fef2f2;padding:18px;text-align:center">
                    <div style="margin-bottom:8px;font-size:28px">
                        ⚠️
                    </div>

                    <div style="font-size:18px;font-weight:700;color:#b91c1c">
                        Job Cancelled
                    </div>
                </div>

                <h2 style="margin-bottom:8px;color:#1a1a1a;font-size:18px">
                    Hello ${job.customer?.name || "Customer"},
                </h2>

                <p style="margin-bottom:20px;color:#555;font-size:13px;line-height:1.6">
                    We regret to inform you that your booking with Khan Moves
                    has been cancelled.
                </p>

                <div style="margin-bottom:20px;border-radius:8px;background:#f7f7f7;padding:16px 20px">
                    <table style="width:100%;border-collapse:collapse">
                        <tr>
                            <td style="width:120px;padding-bottom:7px;color:#888;font-size:11px">
                                Booking Ref
                            </td>

                            <td style="padding-bottom:7px;color:#1a1a1a;font-size:11px;font-weight:600">
                                ${job.bookingRef}
                            </td>
                        </tr>

                        <tr>
                            <td style="padding-bottom:7px;color:#888;font-size:11px">
                                Service
                            </td>

                            <td style="padding-bottom:7px;color:#1a1a1a;font-size:11px;font-weight:600">
                               ${serviceLabel}
                            </td>
                        </tr>

                        <tr>
                            <td style="padding-bottom:7px;color:#888;font-size:11px">
                                Move Date
                            </td>

                            <td style="padding-bottom:7px;color:#1a1a1a;font-size:11px;font-weight:600">
                                ${job.dateType === "flexible"
                    ? "Flexible"
                    : job.date || "—"
                }
                            </td>
                        </tr>

                        <tr>
                            <td style="padding-bottom:7px;color:#888;font-size:11px">
                                Time Slot
                            </td>

                            <td style="padding-bottom:7px;color:#1a1a1a;font-size:11px;font-weight:600">
                                ${job.dateType === "flexible"
                    ? "Flexible Timing"
                    : formatTimeSlot(job.timeSlot)
                }
                            </td>
                        </tr>

                        <tr>
                            <td style="color:#888;font-size:11px">
                                Route
                            </td>

                            <td style="color:#1a1a1a;font-size:11px;font-weight:600">
                                ${job.pickup?.postcode || "—"}
                                →
                                ${job.delivery?.postcode || "—"}
                            </td>
                        </tr>
                    </table>
                </div>

                <div style="margin-bottom:20px;border:1px solid #fca5a5;border-radius:8px;background:#fff1f2;padding:16px 20px">
                    <p style="margin:0 0 6px;color:#b91c1c;font-size:10px;font-weight:700;text-transform:uppercase">
                        Cancellation Reason
                    </p>

                    <p style="margin:0;color:#333;font-size:13px;line-height:1.6">
                        ${reason}
                    </p>
                </div>

                <p style="color:#555;font-size:13px;line-height:1.6">
                    We apologise for any inconvenience. For assistance,
                    contact us at
                    <a
                        href="mailto:khanmovesuk@gmail.com"
                        style="color:#C0392B"
                    >
                        khanmovesuk@gmail.com
                    </a>
                    or call <strong>07424 153126</strong>.
                </p>
            </div>

            <div style="height:4px;background:#C0392B"></div>
        </div>
    </body>
    </html>
    `;

            try {
                await sendEmail(
                    job.customer.email,
                    `Job Cancelled - ${job.bookingRef}`,
                    cancellationEmail
                );
            } catch (emailError) {
                console.error(
                    "Customer cancellation email failed:",
                    emailError.message
                );
            }
        }

        return res.json({
            success: true,
            message: "Job cancelled and notifications sent successfully.",
            data: job
        });
    } catch (err) {
        console.error(
            "Cancel job error:",
            err
        );

        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};
const moveJobToTrash = async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);

        if (!job) {
            return res.status(404).json({
                success: false,
                message: "Job not found."
            });
        }

        if (job.status !== "cancelled") {
            return res.status(400).json({
                success: false,
                message: "Only cancelled jobs can be moved to Trash."
            });
        }

        job.status = "in_trash";
        job.trashedAt = new Date();

        job.statusHistory.push({
            status: "in_trash",
            reason: "Moved to Trash by admin"
        });

        await job.save();

        return res.json({
            success: true,
            message: "Job moved to Trash.",
            data: job
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// Assign driver + vehicle, send WhatsApp to driver with locations
const assignJob = async (req, res) => {
    try {
        const {
            driverId,
            vehicleId
        } = req.body;

        if (!driverId && !vehicleId) {
            return res.status(400).json({
                success: false,
                message: "Please select a driver or vehicle."
            });
        }

        const job = await Job.findById(
            req.params.id
        );

        if (!job) {
            return res.status(404).json({
                success: false,
                message: "Job not found."
            });
        }

        if (job.status !== "active") {
            return res.status(400).json({
                success: false,
                message: "Resources can only be assigned to active jobs."
            });
        }

        const previousDriverId =
            job.assignedDriver?.toString() || "";

        const previousVehicleId =
            job.assignedVehicle?.toString() || "";

        let driver = null;
        let vehicle = null;

        if (driverId) {
            driver = await Driver.findById(
                driverId
            );

            if (!driver) {
                return res.status(404).json({
                    success: false,
                    message: "Driver not found."
                });
            }
        } else if (job.assignedDriver) {
            driver = await Driver.findById(
                job.assignedDriver
            );
        }

        if (vehicleId) {
            vehicle = await Vehicle.findById(
                vehicleId
            );

            if (!vehicle) {
                return res.status(404).json({
                    success: false,
                    message: "Vehicle not found."
                });
            }
        } else if (job.assignedVehicle) {
            vehicle = await Vehicle.findById(
                job.assignedVehicle
            );
        }

        if (
            driverId &&
            previousDriverId &&
            previousDriverId !==
            String(driverId)
        ) {
            await Driver.findByIdAndUpdate(
                previousDriverId,
                {
                    assignedNow: "None"
                }
            );
        }

        if (
            vehicleId &&
            previousVehicleId &&
            previousVehicleId !==
            String(vehicleId)
        ) {
            await Vehicle.findByIdAndUpdate(
                previousVehicleId,
                {
                    assignedDriver: ""
                }
            );
        }

        if (driverId && driver) {
            job.assignedDriver =
                driver._id;

            job.assignedDriverName =
                driver.name;

            await Driver.findByIdAndUpdate(
                driver._id,
                {
                    assignedNow:
                        job.bookingRef
                }
            );
        }

        if (vehicleId && vehicle) {
            job.assignedVehicle =
                vehicle._id;

            job.assignedVehicleReg =
                vehicle.regNumber;
        }

        if (vehicle?._id) {
            await Vehicle.findByIdAndUpdate(
                vehicle._id,
                {
                    assignedDriver:
                        driver?.name ||
                        job.assignedDriverName ||
                        ""
                }
            );
        }

        await job.save();

        if (driver?.phone) {
            const getDirectionsLink = location => {
                const destination =
                    location?.lat &&
                        location?.lng
                        ? `${location.lat},${location.lng}`
                        : `${location?.address || ""} ${location?.postcode || ""}`.trim();

                return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                    destination
                )}&travelmode=driving&dir_action=navigate`;
            };

            const pickupMapsLink =
                getDirectionsLink(
                    job.pickup
                );

            const deliveryMapsLink =
                getDirectionsLink(
                    job.delivery
                );

            const assignedVehicleLabel =
                vehicle
                    ? `${vehicle.regNumber}${vehicle.makeModel
                        ? ` - ${vehicle.makeModel}`
                        : ""
                    }`
                    : job.assignedVehicleReg ||
                    "Not assigned";

            const serviceLabel =
                await getServiceLabel(
                    job.serviceType
                );
            const message =
                `Hello ${driver.name},\n\n` +
                `You have been assigned a new job!\n\n` +
                `*Job Ref:* ${job.bookingRef}\n` +
                `*Service:* ${serviceLabel}\n` +
                `*Date:* ${job.dateType === "flexible"
                    ? "Flexible"
                    : job.date || "—"
                }\n` +
                `*Time Slot:* ${job.dateType === "flexible"
                    ? "Flexible Timing"
                    : formatTimeSlot(
                        job.timeSlot
                    )
                }\n` +
                `*Assigned Vehicle:* ${assignedVehicleLabel}\n\n` +

                `*CUSTOMER CONTACT:*\n` +
                `Name: ${job.customer?.name || "—"}\n` +
                `Phone: ${job.customer?.phone || "—"}\n` +
                (
                    job.customer?.whatsapp
                        ? `WhatsApp: ${job.customer.whatsapp}\n`
                        : ""
                ) +

                `\n*PICKUP LOCATION:*\n` +
                `${job.pickup?.address || "—"}, ${job.pickup?.postcode || ""}\n` +
                `Floor: ${job.pickupFloor?.floorLevel || "Ground"} | ` +
                `Lift: ${job.pickupFloor?.hasLift ? "Yes" : "No"} | ` +
                `Parking: ${job.pickupFloor?.hasParking ? "Yes" : "No"}\n` +
                `Directions: ${pickupMapsLink}\n\n` +

                `*DELIVERY LOCATION:*\n` +
                `${job.delivery?.address || "—"}, ${job.delivery?.postcode || ""}\n` +
                `Floor: ${job.deliveryFloor?.floorLevel || "Ground"} | ` +
                `Lift: ${job.deliveryFloor?.hasLift ? "Yes" : "No"} | ` +
                `Parking: ${job.deliveryFloor?.hasParking ? "Yes" : "No"}\n` +
                `Directions: ${deliveryMapsLink}\n\n` +

                `*Distance:* ${job.distance || 0} miles\n` +
                `*Estimated Delivery Time:* ${job.estimatedDeliveryTime ||
                "To be arranged"
                }\n\n` +

                (
                    job.specialInstructions
                        ? `*Special Instructions:* ${job.specialInstructions}\n\n`
                        : ""
                ) +

                `Please be on time.\n\n` +
                `*Please reply CONFIRM when you start the job.*\n` +
                `— Khan Moves`;

            await sendWhatsApp(
                driver.phone,
                message
            );
        }

        const updatedJob =
            await Job.findById(job._id)
                .populate(
                    "assignedDriver",
                    "name phone"
                )
                .populate(
                    "assignedVehicle",
                    "regNumber makeModel"
                );

        return res.json({
            success: true,
            message: driver?.phone
                ? "Resources assigned and driver notified."
                : "Resources assigned successfully.",
            data: updatedJob
        });
    } catch (err) {
        console.error(
            "Assign job error:",
            err
        );

        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// ── POST /api/jobs/:id/complete-email ────────
const completeJobEmail = async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);
        if (!job) return res.status(404).json({ success: false, message: "Job not found." });
        if (!job.customer?.email) return res.json({ success: true, message: "No email on file." });
        const serviceLabel =
            await getServiceLabel(
                job.serviceType
            );
        const html = `
        <!DOCTYPE html><html><head><meta charset="UTF-8"></head>
        <body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f5f5f5">
        <div style="max-width:600px;margin:0 auto;background:#fff">
            <div style="height:5px;background:#C0392B"></div>
            <div style="background:#C0392B;padding:24px 32px;display:flex;align-items:center;justify-content:space-between">
                <div>
                    <div style="color:#fff;font-size:20px;font-weight:700;font-family:Arial,sans-serif">KHAN MOVES</div>
                    <div style="color:#ffcccc;font-size:11px;font-family:Arial,sans-serif;margin-top:2px">Professional Removals UK</div>
                </div>
                <div style="color:#fff;font-size:13px;font-family:Arial,sans-serif;font-weight:700">${job.bookingRef}</div>
            </div>
            <div style="padding:28px 32px">
                <div style="background:#d4edda;border:1px solid #c3e6cb;border-radius:8px;padding:16px 20px;margin-bottom:24px;text-align:center">
                    <div style="font-size:28px;margin-bottom:8px">🎉</div>
                    <div style="font-size:18px;font-weight:700;color:#155724;font-family:Arial,sans-serif">Move Completed Successfully!</div>
                </div>
                <h2 style="color:#1a1a1a;font-size:18px;margin-bottom:8px;font-family:Arial,sans-serif">Hello ${job.customer?.name || "Customer"},</h2>
                <p style="color:#555;font-size:13px;line-height:1.6;margin-bottom:16px;font-family:Arial,sans-serif">
                    We are pleased to confirm that your move with Khan Moves has been <strong>completed successfully</strong>. We hope everything went smoothly and you are happy with our service.
                </p>
                <div style="background:#f7f7f7;border-radius:8px;padding:16px 20px;margin-bottom:20px">
                    <table style="width:100%;border-collapse:collapse">
                        <tr><td style="font-size:11px;color:#888;padding-bottom:5px;width:110px;font-family:Arial,sans-serif">Booking Ref</td><td style="font-size:11px;color:#1a1a1a;font-weight:600;padding-bottom:5px;font-family:Arial,sans-serif">${job.bookingRef}</td></tr>
                        <tr><td style="font-size:11px;color:#888;padding-bottom:5px;font-family:Arial,sans-serif">Service</td><td style="font-size:11px;color:#1a1a1a;font-weight:600;padding-bottom:5px;font-family:Arial,sans-serif">${serviceLabel}</td></tr>
                        <tr><td style="font-size:11px;color:#888;padding-bottom:5px;font-family:Arial,sans-serif">Route</td><td style="font-size:11px;color:#1a1a1a;font-weight:600;padding-bottom:5px;font-family:Arial,sans-serif">${job.pickup?.postcode || ""} → ${job.delivery?.postcode || ""}</td></tr>
                        <tr><td style="font-size:11px;color:#888;font-family:Arial,sans-serif">Total</td><td style="font-size:11px;color:#C0392B;font-weight:700;font-family:Arial,sans-serif">£${(job.totalPrice || 0).toFixed(2)}</td></tr>
                    </table>
                </div>
                <div style="background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:14px 18px;margin-bottom:20px">
                    <p style="font-size:13px;color:#856404;line-height:1.6;font-family:Arial,sans-serif;margin:0">
                        ⚠️ <strong>If your move was not completed fully or you have any concerns</strong>, please contact us immediately at <a href="mailto:info@khanmoves.co.uk" style="color:#C0392B">info@khanmoves.co.uk</a> or call <strong>07700 000000</strong> and we will resolve it right away.
                    </p>
                </div>
                <p style="color:#555;font-size:13px;line-height:1.6;font-family:Arial,sans-serif">
                    Thank you for choosing Khan Moves. We hope to serve you again in the future!
                </p>
            </div>
            <div style="height:4px;background:#C0392B"></div>
        </div>
        </body></html>`;

        await sendEmail(job.customer.email, `Move Completed - ${job.bookingRef}`, html);
        res.json({ success: true, message: "Completion email sent." });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Returns drivers and vehicles NOT assigned to any active/on_way job on same date+timeSlot
const getAvailableResources = async (req, res) => {
    try {
        const { date, timeSlot, jobId } = req.query;

        // Jobs jo same date + timeSlot pe active ya on_way hain
        const filter = {
            status: { $in: ["active", "on_way"] },
            _id: { $ne: jobId }, // current job exclude karo
        };
        if (date) filter.date = date;
        if (timeSlot) filter.timeSlot = timeSlot;

        const conflictingJobs = await Job.find(filter).select("assignedDriver assignedVehicle");

        const busyDriverIds = conflictingJobs
            .filter(j => j.assignedDriver)
            .map(j => j.assignedDriver.toString());

        const busyVehicleIds = conflictingJobs
            .filter(j => j.assignedVehicle)
            .map(j => j.assignedVehicle.toString());

        const [drivers, vehicles] = await Promise.all([
            Driver.find({ _id: { $nin: busyDriverIds } }).select("name phone assignedNow"),
            Vehicle.find({ _id: { $nin: busyVehicleIds } }).select("regNumber makeModel"),
        ]);

        res.json({ success: true, data: { drivers, vehicles } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const getJobHistory = async (req, res) => {
    try {

        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;

        const skip = (page - 1) * limit;

        // Only completed jobs
        const filter = {
            status: "completed",
        };

        // Filter by job move date
        if (req.query.from) {
            filter.date = req.query.from;
        }

        const total = await Job.countDocuments(filter);

        const jobs = await Job.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.json({
            success: true,
            data: jobs,
            page,
            totalPages: Math.ceil(total / limit),
            total,
        });

    } catch (err) {

        console.error("Get Job History Error:", err);

        res.status(500).json({
            success: false,
            message: err.message,
        });

    }
};

const getCancelledJobs = async (req, res) => {
    try {
        const page = Math.max(
            1,
            Number(req.query.page) || 1
        );

        const limit = Math.max(
            1,
            Number(req.query.limit) || 10
        );

        const skip = (page - 1) * limit;

        const filter = {
            status: "cancelled"
        };

        // Filter using the job pickup/move date
        if (req.query.from || req.query.to) {
            filter.date = {};

            if (req.query.from) {
                filter.date.$gte = req.query.from;
            }

            if (req.query.to) {
                filter.date.$lte = req.query.to;
            }
        }

        const total = await Job.countDocuments(filter);

        const jobs = await Job.find(filter)
            .populate(
                "assignedDriver",
                "name phone"
            )
            .populate(
                "assignedVehicle",
                "regNumber makeModel"
            )
            .sort({
                cancelledAt: -1,
                updatedAt: -1
            })
            .skip(skip)
            .limit(limit);

        return res.json({
            success: true,
            data: jobs,
            page,
            total,
            totalPages: Math.max(
                1,
                Math.ceil(total / limit)
            )
        });
    } catch (err) {
        console.error(
            "Get Cancelled Jobs Error:",
            err
        );

        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

const getTrashJobs = async (req, res) => {

    try {

        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;

        const skip = (page - 1) * limit;

        const filter = {
            status: "in_trash",
        };

        if (req.query.from && req.query.to) {

            filter.createdAt = {
                $gte: new Date(req.query.from),
                $lte: new Date(req.query.to),
            };

        }

        const total = await Job.countDocuments(filter);

        const jobs = await Job.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.json({

            success: true,
            data: jobs,
            page,
            totalPages: Math.ceil(total / limit),
            total,

        });

    } catch (err) {

        res.status(500).json({

            success: false,
            message: err.message,

        });

    }

};

const deleteTrashJob = async (req, res) => {

    try {

        const job = await Job.findOneAndDelete({

            _id: req.params.id,
            status: "in_trash",

        });

        if (!job) {

            return res.status(404).json({

                success: false,
                message: "Job not found",

            });

        }

        res.json({

            success: true,
            message: "Deleted",

        });

    } catch (err) {

        res.status(500).json({

            success: false,
            message: err.message,

        });

    }

};

const deleteAllTrashJobs = async (req, res) => {

    try {

        await Job.deleteMany({

            status: "in_trash",

        });

        res.json({

            success: true,
            message: "Trash cleared",

        });

    } catch (err) {

        res.status(500).json({

            success: false,
            message: err.message,

        });

    }

};

module.exports = {
    createJobFromBooking,
    rejectBooking,
    getAllJobs,
    getJob,
    updateJob,
    updateJobStatus,
    cancelJob,
    moveJobToTrash,
    assignJob,
    completeJobEmail,
    getAvailableResources,
    getJobHistory,
    getCancelledJobs,
    getTrashJobs,
    deleteTrashJob,
    deleteAllTrashJobs
};