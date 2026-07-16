const Expense = require("../models/Expense");
const Driver = require("../models/Driver");
const Job = require("../models/Job");

// Create Expense
exports.createExpense = async (req, res) => {
    try {
        const {
            jobId,
            driverCharges,
            nightStay,
            meals,
            fuel,
            repair,
            other,
            notes,
        } = req.body;

        const job = await Job.findById(jobId);

        if (!job) {
            return res.status(404).json({
                success: false,
                message: "Job not found.",
            });
        }

        const totalExpense =
            Number(driverCharges || 0) +
            Number(nightStay || 0) +
            Number(meals || 0) +
            Number(fuel || 0) +
            Number(repair || 0) +
            Number(other || 0);

        const expense = await Expense.create({
            job: job._id,
            jobRef: job.bookingRef,
            driver: job.assignedDriver || null,
            driverName: job.assignedDriverName || "",
            driverCharges: Number(driverCharges || 0),
            nightStay: Number(nightStay || 0),
            meals: Number(meals || 0),
            fuel: Number(fuel || 0),
            repair: Number(repair || 0),
            other: Number(other || 0),
            totalExpense,
            notes: notes || "",
        });

        // Update Driver Earnings
        if (job.assignedDriver && Number(driverCharges) > 0) {
            await Driver.findByIdAndUpdate(job.assignedDriver, {
                $inc: {
                    earnings: Number(driverCharges),
                },
            });
        }

        return res.status(201).json({
            success: true,
            data: expense,
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};

// Get All Expenses
exports.getAllExpenses = async (req, res) => {
    try {
        const expenses = await Expense.find().sort({ createdAt: -1 });

        return res.json({
            success: true,
            data: expenses,
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};

// Get Expenses By Job
exports.getExpensesByJob = async (req, res) => {
    try {
        const expenses = await Expense.find({
            job: req.params.jobId,
        });

        return res.json({
            success: true,
            data: expenses,
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};