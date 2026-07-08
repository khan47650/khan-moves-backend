require("dotenv").config();
const express = require("express");
const cors = require("cors");

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


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});