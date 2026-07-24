const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema(
    {
        itemId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null
        },
        categoryName: {
            type: String,
            default: ""
        },
        name: {
            type: String,
            default: ""
        },
        volume: {
            type: Number,
            default: 0
        },
        quantity: {
            type: Number,
            default: 1
        }
    },
    { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
    {
        status: {
            type: String,
            required: true
        },
        reason: {
            type: String,
            default: ""
        },
        changedAt: {
            type: Date,
            default: Date.now
        }
    },
    { _id: false }
);

const jobSchema = new mongoose.Schema(
    {
        booking: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Booking",
            required: true
        },

        bookingRef: {
            type: String,
            required: true
        },

        serviceType: {
            type: String,
            default: ""
        },

        customer: {
            name: {
                type: String,
                default: ""
            },
            phone: {
                type: String,
                default: ""
            },
            email: {
                type: String,
                default: ""
            },
            whatsapp: {
                type: String,
                default: ""
            }
        },

        pickup: {
            address: {
                type: String,
                default: ""
            },
            postcode: {
                type: String,
                default: ""
            },
            town: {
                type: String,
                default: ""
            },
            lat: {
                type: Number,
                default: null
            },
            lng: {
                type: Number,
                default: null
            }
        },

        delivery: {
            address: {
                type: String,
                default: ""
            },
            postcode: {
                type: String,
                default: ""
            },
            town: {
                type: String,
                default: ""
            },
            lat: {
                type: Number,
                default: null
            },
            lng: {
                type: Number,
                default: null
            }
        },

        pickupFloor: {
            floorLevel: {
                type: String,
                default: "ground"
            },
            hasLift: {
                type: Boolean,
                default: true
            },
            hasParking: {
                type: Boolean,
                default: true
            }
        },

        deliveryFloor: {
            floorLevel: {
                type: String,
                default: "ground"
            },
            hasLift: {
                type: Boolean,
                default: true
            },
            hasParking: {
                type: Boolean,
                default: true
            }
        },

        items: {
            type: [itemSchema],
            default: []
        },

        totalVolume: {
            type: Number,
            default: 0
        },

        // Pickup schedule from booking
        date: {
            type: String,
            default: ""
        },

        dateType: {
            type: String,
            enum: ["specific", "flexible"],
            default: "specific"
        },

        timeSlot: {
            type: String,
            default: ""
        },

        // Delivery schedule controlled by admin
        deliveryDate: {
            type: String,
            default: ""
        },

        deliveryTimeSlot: {
            type: String,
            default: ""
        },

        distance: {
            type: Number,
            default: 0
        },

        totalPrice: {
            type: Number,
            default: 0
        },

        specialInstructions: {
            type: String,
            default: ""
        },

        assignedDriver: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Driver",
            default: null
        },

        assignedDriverName: {
            type: String,
            default: ""
        },

        assignedVehicle: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Vehicle",
            default: null
        },

        assignedVehicleReg: {
            type: String,
            default: ""
        },

        status: {
            type: String,
            enum: [
                "active",
                "on_way",
                "completed",
                "cancelled",
                "in_trash"
            ],
            default: "active"
        },

        cancelReason: {
            type: String,
            default: ""
        },

        cancelledAt: {
            type: Date,
            default: null
        },

        completedAt: {
            type: Date,
            default: null
        },

        trashedAt: {
            type: Date,
            default: null
        },

        statusHistory: {
            type: [statusHistorySchema],
            default: []
        },

        adminNotes: {
            type: String,
            default: ""
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Job", jobSchema);