const mongoose = require("mongoose");

const driverSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },

    phone: {
        type: String,
        trim: true,
        default: ""
    },

    licenseNumber: {
        type: String,
        trim: true,
        default: ""
    },

    joiningDate: {
        type: String,
        default: ""
    },

    bankDetails: {
        type: String,
        default: ""
    },

    licensePdfUrl: {
        type: String,
        default: ""
    },

    licensePdfPublicId: {
        type: String,
        default: ""
    },

    totalJobs: {
        type: Number,
        default: 0
    },

    earnings: {
        type: Number,
        default: 0
    },

    assignedNow: {
        type: String,
        default: "None"
    },

    completedJobs: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Job"
        }
    ],

}, { timestamps: true });


module.exports = mongoose.model("Driver", driverSchema);