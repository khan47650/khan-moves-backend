const express = require("express");
const router = express.Router();
const {
    createExpense,
    getAllExpenses,
    getExpensesByJob,
    updateExpense,
    deleteExpense
} = require("../controllers/expenseController");

router.post("/", createExpense);
router.get("/", getAllExpenses);
router.get("/job/:jobId", getExpensesByJob);
router.patch("/:id", updateExpense);
router.delete("/:id", deleteExpense);

module.exports = router;