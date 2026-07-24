const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
    {
        expenseScope: {
            type: String,
            enum: [
                "job",
                "driver",
                "general"
            ],
            default: "job"
        },

        expenseCategory: {
            type: String,
            enum: [
                "fuel",
                "congestionUlez",
                "driverPay",
                "nightStay",
                "repair"
            ],
            required: true
        },

        job: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Job",
            default: null
        },

        jobRef: {
            type: String,
            default: ""
        },

        driver: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Driver",
            default: null
        },

        driverName: {
            type: String,
            default: ""
        },

        vehicle: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Vehicle",
            default: null
        },

        vehicleReg: {
            type: String,
            default: ""
        },

        milesDriven: {
            type: Number,
            default: 0,
            min: 0
        },

        driverPaid: {
            type: Boolean,
            default: false
        },

        expenseDate: {
            type: Date,
            default: Date.now
        },

        driverCharges: {
            type: Number,
            default: 0,
            min: 0
        },

        nightStay: {
            type: Number,
            default: 0,
            min: 0
        },

        fuel: {
            type: Number,
            default: 0,
            min: 0
        },

        repair: {
            type: Number,
            default: 0,
            min: 0
        },

        other: {
            type: Number,
            default: 0,
            min: 0
        },

        totalExpense: {
            type: Number,
            default: 0,
            min: 0
        },

        notes: {
            type: String,
            default: "",
            maxlength: 450
        }
    },
    {
        timestamps: true
    }
);

expenseSchema.index({
    expenseCategory: 1,
    expenseDate: -1
});

expenseSchema.index({
    vehicle: 1,
    expenseCategory: 1
});

module.exports = mongoose.model(
    "Expense",
    expenseSchema
);