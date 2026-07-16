require("dotenv").config();
const express = require("express");
const cors = require("cors");

const inventoryRoutes = require("./routes/inventoryRoutes");
const driverRoutes = require("./routes/driverRoutes");
const vehicleRoutes = require("./routes/vehicleRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const jobRoutes = require("./routes/jobRoutes");
const expenseRoutes = require("./routes/expenseRoutes");

const app = express();

const connectDB = require("./config/db");

connectDB();


app.use(
    cors({
        origin: [
            "http://localhost:3000"
        ],
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

const PORT = process.env.PORT || 5000;



app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});