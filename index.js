require("dotenv").config();
const express = require("express");
const cors = require("cors");

const inventoryRoutes = require("./routes/inventoryRoutes");
const driverRoutes = require("./routes/driverRoutes");
const vehicleRoutes = require("./routes/vehicleRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const jobRoutes = require("./routes/jobRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const toolRoutes = require("./routes/toolRoutes");

const app = express();

const connectDB = require("./config/db");

connectDB();


const allowedOrigins = [
    "http://localhost:3000",
    "https://khan-moves-frontend.vercel.app"
];

app.use(
    cors({
        origin: function (origin, callback) {
            // Allow requests with no origin (like Postman)
            if (!origin) return callback(null, true);

            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            return callback(new Error("Not allowed by CORS"));
        },
        credentials: true,
    })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use("/api/inventory", inventoryRoutes);
app.use("/api/drivers", driverRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/tools", toolRoutes);

const PORT = process.env.PORT || 5000;



app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});