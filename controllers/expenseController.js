const Expense = require("../models/Expense");
const Driver = require("../models/Driver");
const Job = require("../models/Job");

const numberValue = (value) => Number(value || 0);

const calculateTotal = (data) => {
    return numberValue(data.driverCharges) +
        numberValue(data.nightStay) +
        numberValue(data.meals) +
        numberValue(data.fuel) +
        numberValue(data.repair) +
        numberValue(data.other);
};

const getDateFilter = (period) => {
    const now = new Date();
    if (period === "weekly") {
        const start = new Date(now);
        start.setDate(now.getDate() - 7);
        return { $gte: start, $lte: now };
    }
    if (period === "last_month") {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        return { $gte: start, $lte: end };
    }
    if (period === "last_year") {
        const start = new Date(now.getFullYear() - 1, 0, 1);
        const end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
        return { $gte: start, $lte: end };
    }
    return null;
};

const createExpense = async (req, res) => {
    try {
        const {
            jobId,
            driverId,
            driverCharges,
            nightStay,
            meals,
            fuel,
            repair,
            other,
            notes
        } = req.body;
        let job = null;

        if (jobId) {

            job = await Job.findById(jobId);

            if (!job) {

                return res.status(404).json({
                    success: false,
                    message: "Job not found."
                });

            }

        }




        let driver = null;
        // agar admin ne driver select kiya
        if (driverId) {

            driver = await Driver.findById(driverId);

        }
        // agar job ke assigned driver se expense bana
        else if (job?.assignedDriver) {

            driver = await Driver.findById(job.assignedDriver);

        }

        const expenseData = {

            driverCharges: Number(driverCharges || 0),

            nightStay: Number(nightStay || 0),

            meals: Number(meals || 0),

            fuel: Number(fuel || 0),

            repair: Number(repair || 0),

            other: Number(other || 0),

        };
        const totalExpense =
            expenseData.driverCharges +
            expenseData.nightStay +
            expenseData.meals +
            expenseData.fuel +
            expenseData.repair +
            expenseData.other;
        const expense = await Expense.create({

            job: job?._id || null,
            jobRef: job?.bookingRef || "",
            driver: driver?._id || null,
            driverName: driver?.name || "",
            ...expenseData,
            totalExpense,
            notes: notes || ""

        });

        // ONLY DRIVER CHARGES ADD HERE
        if (driver && expenseData.driverCharges > 0) {
            await Driver.findByIdAndUpdate(
                driver._id,
                {

                    $inc: {
                        earnings: expenseData.driverCharges
                    }

                }

            );


        }
        res.status(201).json({

            success: true,

            data: expense

        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message

        });

    }

};

const getAllExpenses = async (req, res) => {
    try {
        const { type = "all", period = "all" } = req.query;
        const filter = {};

        const dateFilter = getDateFilter(period);

        if (dateFilter) {
            filter.createdAt = dateFilter;
        }

        const allowedTypes = [
            "driverCharges",
            "nightStay",
            "meals",
            "fuel",
            "repair",
            "other"
        ];

        if (type !== "all" && allowedTypes.includes(type)) {
            filter[type] = { $gt: 0 };
        }

        const expenses = await Expense.find(filter)
            .populate("job", "bookingRef customer date")
            .populate("driver", "name phone")
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: expenses
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};


const getExpensesByJob = async (req, res) => {
    try {

        const expenses = await Expense.find({
            job: req.params.jobId
        }).sort({ createdAt: -1 });


        res.json({
            success: true,
            data: expenses
        });


    } catch (err) {

        res.status(500).json({
            success: false,
            message: err.message
        });

    }
};


const updateExpense = async (req, res) => {
    try {

        const expense = await Expense.findById(req.params.id);

        if (!expense) {
            return res.status(404).json({
                success: false,
                message: "Expense not found."
            });
        }


        const oldDriverCharges = Number(expense.driverCharges || 0);
        const newDriverCharges = Number(req.body.driverCharges || 0);

        const difference = newDriverCharges - oldDriverCharges;


        expense.driverCharges = newDriverCharges;
        expense.nightStay = Number(req.body.nightStay || 0);
        expense.meals = Number(req.body.meals || 0);
        expense.fuel = Number(req.body.fuel || 0);
        expense.repair = Number(req.body.repair || 0);
        expense.other = Number(req.body.other || 0);
        expense.notes = req.body.notes || "";


        expense.totalExpense =
            expense.driverCharges +
            expense.nightStay +
            expense.meals +
            expense.fuel +
            expense.repair +
            expense.other;


        await expense.save();


        if (expense.driver && difference !== 0) {

            await Driver.findByIdAndUpdate(
                expense.driver,
                {
                    $inc: {
                        earnings: difference
                    }
                }
            );

        }


        res.json({
            success: true,
            data: expense
        });


    } catch (err) {

        res.status(500).json({
            success: false,
            message: err.message
        });

    }
};


const deleteExpense = async (req, res) => {
    try {

        const expense = await Expense.findById(req.params.id);

        if (!expense) {
            return res.status(404).json({
                success: false,
                message: "Expense not found."
            });
        }


        if (expense.driver && numberValue(expense.driverCharges) > 0) {

            await Driver.findByIdAndUpdate(
                expense.driver,
                {
                    $inc: {
                        earnings: -numberValue(expense.driverCharges)
                    }
                }
            );

        }


        await expense.deleteOne();


        res.json({
            success: true,
            message: "Expense deleted."
        });


    } catch (err) {

        res.status(500).json({
            success: false,
            message: err.message
        });

    }
};


module.exports = {
    createExpense,
    getAllExpenses,
    getExpensesByJob,
    updateExpense,
    deleteExpense
};