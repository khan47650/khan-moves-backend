const express = require("express");
const router = express.Router();

const expenseController = require("../controllers/expenseController");
const { createExpense, getAllExpenses, getExpensesByJob } = require("../controllers/expenseController");

router.post("/", createExpense);

router.get("/", getAllExpenses);

router.get("/job/:jobId", getExpensesByJob);

module.exports = router;