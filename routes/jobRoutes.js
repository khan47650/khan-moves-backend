const express = require("express");
const router = express.Router();
const {
    createJobFromBooking,
    rejectBooking,
    getAllJobs,
    getJob,
    updateJobStatus,
    assignJob,
    completeJobEmail,
    getAvailableResources,

    getJobHistory,
    getTrashJobs,
    deleteTrashJob,
    deleteAllTrashJobs,
} = require("../controllers/jobController");

router.post("/from-booking/:bookingId", createJobFromBooking);
router.post("/reject-booking/:bookingId", rejectBooking);

router.get("/available-resources", getAvailableResources);

router.get("/history", getJobHistory);
router.get("/trash", getTrashJobs);

router.get("/", getAllJobs);

router.get("/:id", getJob);

router.patch("/:id/status", updateJobStatus);
router.patch("/:id/assign", assignJob);
router.post("/:id/complete-email", completeJobEmail);

router.delete("/trash/:id", deleteTrashJob);
router.delete("/trash", deleteAllTrashJobs);

module.exports = router;