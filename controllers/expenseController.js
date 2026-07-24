const Expense = require("../models/Expense");
const Driver = require("../models/Driver");
const Vehicle = require("../models/Vehicle");
const Job = require("../models/Job");

const numberValue = value =>
    Math.max(0, Number(value) || 0);

const allowedScopes = [
    "job",
    "driver",
    "general"
];

const allowedCategories = [
    "fuel",
    "congestionUlez",
    "driverPay",
    "nightStay",
    "repair"
];

const driverCategories = [
    "driverPay",
    "nightStay"
];

const vehicleCategories = [
    "fuel",
    "repair",
    "congestionUlez"
];

const getCategoryValues = (
    category,
    amount
) => {
    return {
        driverCharges:
            category === "driverPay"
                ? amount
                : 0,

        nightStay:
            category === "nightStay"
                ? amount
                : 0,

        fuel:
            category === "fuel"
                ? amount
                : 0,

        repair:
            category === "repair"
                ? amount
                : 0,

        other:
            category === "congestionUlez"
                ? amount
                : 0
    };
};

const parseExpenseDate = value => {
    if (!value) return new Date();

    const date = new Date(
        /^\d{4}-\d{2}-\d{2}$/.test(value)
            ? `${value}T12:00:00`
            : value
    );

    return Number.isNaN(date.getTime())
        ? null
        : date;
};

const getDateFilter = period => {
    const now = new Date();

    const startOfDay = date => {
        const value = new Date(date);
        value.setHours(0, 0, 0, 0);
        return value;
    };

    const endOfDay = date => {
        const value = new Date(date);
        value.setHours(23, 59, 59, 999);
        return value;
    };

    if (period === "today") {
        return {
            $gte: startOfDay(now),
            $lte: endOfDay(now)
        };
    }

    if (period === "yesterday") {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);

        return {
            $gte: startOfDay(yesterday),
            $lte: endOfDay(yesterday)
        };
    }

    if (period === "last_7_days") {
        const start = new Date(now);
        start.setDate(start.getDate() - 6);

        return {
            $gte: startOfDay(start),
            $lte: endOfDay(now)
        };
    }

    if (period === "this_month") {
        return {
            $gte: new Date(
                now.getFullYear(),
                now.getMonth(),
                1
            ),
            $lte: endOfDay(now)
        };
    }

    if (period === "this_year") {
        return {
            $gte: new Date(
                now.getFullYear(),
                0,
                1
            ),
            $lte: endOfDay(now)
        };
    }

    return null;
};



const createExpense = async (req, res) => {
    try {
        const {
            expenseScope = "job",
            expenseCategory,
            jobId,
            driverId,
            vehicleId,
            amount,
            milesDriven,
            driverPaid,
            expenseDate,
            notes
        } = req.body;

        if (!allowedScopes.includes(expenseScope)) {
            return res.status(400).json({
                success: false,
                message: "Invalid expense type."
            });
        }

        if (
            !allowedCategories.includes(
                expenseCategory
            )
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid expense category."
            });
        }

        const expenseAmount =
            numberValue(amount);

        if (expenseAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Expense amount must be greater than zero."
            });
        }

        const parsedDate =
            parseExpenseDate(expenseDate);

        if (!parsedDate) {
            return res.status(400).json({
                success: false,
                message: "Invalid expense date."
            });
        }

        let job = null;
        let driver = null;
        let vehicle = null;

        if (expenseScope === "job") {
            if (!jobId) {
                return res.status(400).json({
                    success: false,
                    message: "Please select a job."
                });
            }

            job = await Job.findById(jobId);

            if (!job) {
                return res.status(404).json({
                    success: false,
                    message: "Job not found."
                });
            }
        }

        if (
            driverCategories.includes(
                expenseCategory
            )
        ) {
            const resolvedDriverId =
                driverId ||
                job?.assignedDriver ||
                null;

            if (!resolvedDriverId) {
                return res.status(400).json({
                    success: false,
                    message: "Please select a driver."
                });
            }

            driver = await Driver.findById(
                resolvedDriverId
            );

            if (!driver) {
                return res.status(404).json({
                    success: false,
                    message: "Driver not found."
                });
            }
        }

        if (
            vehicleCategories.includes(
                expenseCategory
            )
        ) {
            const resolvedVehicleId =
                vehicleId ||
                job?.assignedVehicle ||
                null;

            if (!resolvedVehicleId) {
                return res.status(400).json({
                    success: false,
                    message: "Please select a vehicle."
                });
            }

            vehicle = await Vehicle.findById(
                resolvedVehicleId
            );

            if (!vehicle) {
                return res.status(404).json({
                    success: false,
                    message: "Vehicle not found."
                });
            }
        }

        const drivenMiles =
            expenseCategory === "fuel"
                ? numberValue(milesDriven)
                : 0;

        if (
            expenseCategory === "fuel" &&
            drivenMiles <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Miles driven are required for fuel expense."
            });
        }

        const categoryValues =
            getCategoryValues(
                expenseCategory,
                expenseAmount
            );

        const expense = await Expense.create({
            expenseScope,
            expenseCategory,

            job: job?._id || null,
            jobRef: job?.bookingRef || "",

            driver: driver?._id || null,
            driverName: driver?.name || "",

            vehicle: vehicle?._id || null,
            vehicleReg:
                vehicle?.regNumber || "",

            milesDriven: drivenMiles,

            driverPaid:
                expenseCategory === "driverPay"
                    ? Boolean(driverPaid)
                    : false,

            expenseDate: parsedDate,

            ...categoryValues,

            totalExpense: expenseAmount,
            notes: String(notes || "").trim()
        });

        if (
            driver &&
            categoryValues.driverCharges > 0
        ) {
            await Driver.findByIdAndUpdate(
                driver._id,
                {
                    $inc: {
                        earnings:
                            categoryValues.driverCharges
                    }
                }
            );
        }

        const populated =
            await Expense.findById(expense._id)
                .populate(
                    "job",
                    "bookingRef customer date"
                )
                .populate(
                    "driver",
                    "name phone"
                )
                .populate(
                    "vehicle",
                    "regNumber makeModel"
                );

        return res.status(201).json({
            success: true,
            data: populated
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const getAllExpenses = async (req, res) => {
    try {
        const {
            type = "all",
            period = "all"
        } = req.query;

        const filter = {};

        const dateFilter =
            getDateFilter(period);

        if (dateFilter) {
            filter.expenseDate = dateFilter;
        }

        if (
            type !== "all" &&
            allowedCategories.includes(type)
        ) {
            filter.expenseCategory = type;
        }

        const expenses = await Expense.find(filter)
            .populate(
                "job",
                "bookingRef customer date"
            )
            .populate(
                "driver",
                "name phone"
            )
            .populate(
                "vehicle",
                "regNumber makeModel"
            )
            .sort({
                expenseDate: -1,
                createdAt: -1
            });

        return res.json({
            success: true,
            data: expenses
        });
    } catch (error) {
        console.error(
            "Get all expenses error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: error.message
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
        const expense =
            await Expense.findById(req.params.id);

        if (!expense) {
            return res.status(404).json({
                success: false,
                message: "Expense not found."
            });
        }

        const {
            expenseScope = expense.expenseScope,
            expenseCategory =
            expense.expenseCategory,
            jobId,
            driverId,
            vehicleId,
            amount,
            milesDriven,
            driverPaid,
            expenseDate,
            notes
        } = req.body;

        if (!allowedScopes.includes(expenseScope)) {
            return res.status(400).json({
                success: false,
                message: "Invalid expense type."
            });
        }

        if (
            !allowedCategories.includes(
                expenseCategory
            )
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid expense category."
            });
        }

        const expenseAmount =
            numberValue(amount);

        if (expenseAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Expense amount must be greater than zero."
            });
        }

        let job = null;
        let driver = null;
        let vehicle = null;

        if (expenseScope === "job") {
            if (!jobId) {
                return res.status(400).json({
                    success: false,
                    message: "Please select a job."
                });
            }

            job = await Job.findById(jobId);

            if (!job) {
                return res.status(404).json({
                    success: false,
                    message: "Job not found."
                });
            }
        }

        if (
            driverCategories.includes(
                expenseCategory
            )
        ) {
            const resolvedDriverId =
                driverId ||
                job?.assignedDriver ||
                null;

            if (!resolvedDriverId) {
                return res.status(400).json({
                    success: false,
                    message: "Please select a driver."
                });
            }

            driver = await Driver.findById(
                resolvedDriverId
            );

            if (!driver) {
                return res.status(404).json({
                    success: false,
                    message: "Driver not found."
                });
            }
        }

        if (
            vehicleCategories.includes(
                expenseCategory
            )
        ) {
            const resolvedVehicleId =
                vehicleId ||
                job?.assignedVehicle ||
                null;

            if (!resolvedVehicleId) {
                return res.status(400).json({
                    success: false,
                    message: "Please select a vehicle."
                });
            }

            vehicle = await Vehicle.findById(
                resolvedVehicleId
            );

            if (!vehicle) {
                return res.status(404).json({
                    success: false,
                    message: "Vehicle not found."
                });
            }
        }

        const drivenMiles =
            expenseCategory === "fuel"
                ? numberValue(milesDriven)
                : 0;

        if (
            expenseCategory === "fuel" &&
            drivenMiles <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Miles driven are required for fuel expense."
            });
        }

        const oldDriverId =
            expense.driver?.toString() || "";

        const oldDriverCharges =
            numberValue(expense.driverCharges);

        const categoryValues =
            getCategoryValues(
                expenseCategory,
                expenseAmount
            );

        expense.expenseScope = expenseScope;
        expense.expenseCategory =
            expenseCategory;

        expense.job = job?._id || null;
        expense.jobRef =
            job?.bookingRef || "";

        expense.driver =
            driver?._id || null;
        expense.driverName =
            driver?.name || "";

        expense.vehicle =
            vehicle?._id || null;
        expense.vehicleReg =
            vehicle?.regNumber || "";

        expense.milesDriven = drivenMiles;

        expense.driverPaid =
            expenseCategory === "driverPay"
                ? Boolean(driverPaid)
                : false;

        if (expenseDate !== undefined) {
            const parsedDate =
                parseExpenseDate(expenseDate);

            if (!parsedDate) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid expense date."
                });
            }

            expense.expenseDate = parsedDate;
        }

        expense.driverCharges =
            categoryValues.driverCharges;
        expense.nightStay =
            categoryValues.nightStay;
        expense.fuel =
            categoryValues.fuel;
        expense.repair =
            categoryValues.repair;
        expense.other =
            categoryValues.other;

        expense.totalExpense =
            expenseAmount;

        expense.notes =
            String(notes || "").trim();

        await expense.save();

        const newDriverId =
            driver?._id?.toString() || "";

        const newDriverCharges =
            categoryValues.driverCharges;

        if (
            oldDriverId &&
            (
                oldDriverId !== newDriverId ||
                oldDriverCharges !==
                newDriverCharges
            )
        ) {
            await Driver.findByIdAndUpdate(
                oldDriverId,
                {
                    $inc: {
                        earnings:
                            -oldDriverCharges
                    }
                }
            );
        }

        if (
            newDriverId &&
            (
                oldDriverId !== newDriverId ||
                oldDriverCharges !==
                newDriverCharges
            )
        ) {
            await Driver.findByIdAndUpdate(
                newDriverId,
                {
                    $inc: {
                        earnings:
                            newDriverCharges
                    }
                }
            );
        }

        const populated =
            await Expense.findById(expense._id)
                .populate(
                    "job",
                    "bookingRef customer date"
                )
                .populate(
                    "driver",
                    "name phone"
                )
                .populate(
                    "vehicle",
                    "regNumber makeModel"
                );

        return res.json({
            success: true,
            data: populated
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
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