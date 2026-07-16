const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema({
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    jobRef: { type: String, required: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: "Driver", default: null },
    driverName: { type: String, default: "" },
    driverCharges: { type: Number, default: 0 },
    nightStay: { type: Number, default: 0 },
    meals: { type: Number, default: 0 },
    fuel: { type: Number, default: 0 },
    repair: { type: Number, default: 0 },
    other: { type: Number, default: 0 },
    totalExpense: { type: Number, default: 0 },
    notes: { type: String, default: "" },
}, { timestamps: true });

module.exports = mongoose.model("Expense", expenseSchema);