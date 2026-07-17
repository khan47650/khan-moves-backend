const Job = require("../models/Job");
const Booking = require("../models/Booking");
const Driver = require("../models/Driver");
const Vehicle = require("../models/Vehicle");
const sendEmail = require("../utils/sendEmail");
const { sendWhatsApp } = require("../utils/sendWhatsApp");

const serviceMap = {
    home: "Home Removal", furniture: "Furniture Move", furniture_move: "Furniture Move",
    office: "Office Removal", office_removal: "Office Removal",
    parcels: "Boxes & Parcels", boxes_parcels: "Boxes & Parcels",
    vehicle: "Vehicle Parts", vehicle_parts: "Vehicle Parts",
    pallets: "Pallets", packing: "Packing Service", packing_service: "Packing Service",
};

// ── POST /api/jobs/from-booking/:bookingId ─────────────────────────────────
// Accept request → create job + send confirmation email to customer
const createJobFromBooking = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.bookingId);
        if (!booking) return res.status(404).json({ success: false, message: "Booking not found." });

        // Check job not already created
        const existing = await Job.findOne({ booking: booking._id });
        if (existing) return res.status(409).json({ success: false, message: "Job already exists for this booking." });

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
            distance: booking.distance,
            totalPrice: booking.totalPrice,
            specialInstructions: booking.specialInstructions,
            status: "active",
        });

        // Update booking status to confirmed
        await Booking.findByIdAndUpdate(booking._id, { status: "confirmed" });

        // Send confirmation email to customer
        if (booking.customer?.email) {
            const svcLabel = serviceMap[booking.serviceType] || booking.serviceType;
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
                            <tr><td style="font-size:11px;color:#888;padding-bottom:5px;font-family:Arial,sans-serif">Time Slot</td><td style="font-size:11px;color:#1a1a1a;font-weight:600;padding-bottom:5px;font-family:Arial,sans-serif;text-transform:capitalize">${booking.timeSlot || "To be confirmed"}</td></tr>
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

// ── POST /api/jobs/reject-booking/:bookingId ───────────────────────────────
// Reject request → send rejection email with reason
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
            "in_trash",
            "completed"
        ];

        if (!allowed.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status."
            });
        }

        const job = await Job.findById(req.params.id);
        if (!job) {
            return res.status(404).json({
                success: false,
                message: "Job not found."
            });
        }


        job.status = status;
        await job.save();
        // COMPLETE JOB
        if (status === "completed") {
            // Driver update
            if (job.assignedDriver) {
                await Driver.findByIdAndUpdate(
                    job.assignedDriver,
                    {
                        assignedNow: "None",

                        $inc: {
                            totalJobs: 1
                        },

                        $addToSet: {
                            completedJobs: job._id
                        }
                    }
                );

            }
            // Vehicle release
            if (job.assignedVehicle) {

                await Vehicle.findByIdAndUpdate(
                    job.assignedVehicle,
                    {
                        assignedDriver: ""
                    }
                );

            }


        }


        res.json({
            success: true,
            data: job
        });
    } catch (err) {

        res.status(500).json({
            success: false,
            message: err.message
        });

    }
};

// Assign driver + vehicle, send WhatsApp to driver with locations
const assignJob = async (req, res) => {
    try {
        const { driverId, vehicleId } = req.body;
        const job = await Job.findById(req.params.id);
        if (!job) return res.status(404).json({ success: false, message: "Job not found." });

        let driverName = job.assignedDriverName;
        let vehicleReg = job.assignedVehicleReg;

        if (driverId) {
            const driver = await Driver.findById(driverId);
            if (!driver) return res.status(404).json({ success: false, message: "Driver not found." });
            job.assignedDriver = driver._id;
            job.assignedDriverName = driver.name;
            driverName = driver.name;

            // Update driver's current job
            await Driver.findByIdAndUpdate(driverId, { assignedNow: job.bookingRef });

            // Send WhatsApp to driver with job details + locations
            if (driver.phone) {
                const getDirectionsLink = location => {
                    const destination =
                        location?.lat && location?.lng
                            ? `${location.lat},${location.lng}`
                            : `${location?.address || ""} ${location?.postcode || ""}`.trim();

                    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving&dir_action=navigate`;
                };

                const pickupMapsLink = getDirectionsLink(job.pickup);
                const deliveryMapsLink = getDirectionsLink(job.delivery);

                const message =
                    `Hello ${driver.name},\n\nYou have been assigned a new job!\n\n` +
                    `*Job Ref:* ${job.bookingRef}\n` +
                    `*Service:* ${serviceMap[job.serviceType] || job.serviceType}\n` +
                    `*Date:* ${job.dateType === "flexible" ? "Flexible" : job.date || "—"}\n` +
                    `*Time Slot:* ${job.timeSlot || "TBC"}\n\n` +
                    `*CUSTOMER CONTACT:*\n` +
                    `Name: ${job.customer?.name || "—"}\n` +
                    `Phone: ${job.customer?.phone || "—"}\n` +
                    (job.customer?.whatsapp
                        ? `WhatsApp: ${job.customer.whatsapp}\n`
                        : "") +
                    `\n*PICKUP LOCATION:*\n` +
                    `${job.pickup?.address || "—"}, ${job.pickup?.postcode || ""}\n` +
                    `Floor: ${job.pickupFloor?.floorLevel || "Ground"} | Lift: ${job.pickupFloor?.hasLift ? "Yes" : "No"} | Parking: ${job.pickupFloor?.hasParking ? "Yes" : "No"}\n` +
                    `Directions: ${pickupMapsLink}\n\n` +
                    `*DELIVERY LOCATION:*\n` +
                    `${job.delivery?.address || "—"}, ${job.delivery?.postcode || ""}\n` +
                    `Floor: ${job.deliveryFloor?.floorLevel || "Ground"} | Lift: ${job.deliveryFloor?.hasLift ? "Yes" : "No"} | Parking: ${job.deliveryFloor?.hasParking ? "Yes" : "No"}\n` +
                    `Directions: ${deliveryMapsLink}\n\n` +
                    `*Distance:* ${job.distance || 0} miles\n\n` +
                    (job.specialInstructions
                        ? `*Special Instructions:* ${job.specialInstructions}\n\n`
                        : "") +
                    `Please be on time.\n\n` +
                    `*Please reply CONFIRM when you start the job.*\n` +
                    `— Khan Moves`;

                await sendWhatsApp(driver.phone, message);
            }
        }

        if (vehicleId) {
            const vehicle = await Vehicle.findById(vehicleId);
            if (!vehicle) return res.status(404).json({ success: false, message: "Vehicle not found." });
            job.assignedVehicle = vehicle._id;
            job.assignedVehicleReg = vehicle.regNumber;
            vehicleReg = vehicle.regNumber;

            // Update vehicle's assigned driver
            if (driverName) {
                await Vehicle.findByIdAndUpdate(vehicleId, { assignedDriver: driverName });
            }
        }

        await job.save();
        res.json({ success: true, data: job });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── POST /api/jobs/:id/complete-email ──────────────────────────────────────
const completeJobEmail = async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);
        if (!job) return res.status(404).json({ success: false, message: "Job not found." });
        if (!job.customer?.email) return res.json({ success: true, message: "No email on file." });

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
                        <tr><td style="font-size:11px;color:#888;padding-bottom:5px;font-family:Arial,sans-serif">Service</td><td style="font-size:11px;color:#1a1a1a;font-weight:600;padding-bottom:5px;font-family:Arial,sans-serif">${serviceMap[job.serviceType] || job.serviceType}</td></tr>
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
    createJobFromBooking, rejectBooking, getAllJobs, getJob, updateJobStatus, assignJob,
    completeJobEmail, getAvailableResources, getJobHistory,
    getTrashJobs,
    deleteTrashJob,
    deleteAllTrashJobs,
};