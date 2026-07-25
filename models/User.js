const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 80
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true
        },

        phone: {
            type: String,
            default: "",
            trim: true
        },

        password: {
            type: String,
            required: true,
            select: false
        },

        role: {
            type: String,
            enum: ["user", "admin"],
            default: "user"
        },

        accountStatus: {
            type: String,
            enum: ["active", "blocked"],
            default: "active"
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model(
    "User",
    userSchema
);