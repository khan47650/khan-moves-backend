const QuickLink = require("../models/QuickLink");
const QuickMessage = require("../models/QuickMessage");

// QUICK LINKS

const getQuickLinks = async (req, res) => {
    try {
        const links = await QuickLink.find().sort({ createdAt: -1 });

        res.json({
            success: true,
            data: links
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};


const createQuickLink = async (req, res) => {
    try {
        const link = await QuickLink.create({
            name: req.body.name,
            link: req.body.link
        });

        res.status(201).json({
            success: true,
            data: link
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};


const updateQuickLink = async (req, res) => {
    try {
        const link = await QuickLink.findByIdAndUpdate(
            req.params.id,
            {
                name: req.body.name,
                link: req.body.link
            },
            {
                returnDocument: "after"
            }
        );

        res.json({
            success: true,
            data: link
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};


const deleteQuickLink = async (req, res) => {
    try {
        await QuickLink.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: "Quick link deleted"
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};


// QUICK MESSAGES

const getQuickMessages = async (req, res) => {
    try {
        const messages = await QuickMessage.find()
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: messages
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};


const createQuickMessage = async (req, res) => {
    try {

        const message = await QuickMessage.create({
            title: req.body.title,
            text: req.body.text
        });

        res.status(201).json({
            success: true,
            data: message
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};


const updateQuickMessage = async (req, res) => {
    try {

        const message = await QuickMessage.findByIdAndUpdate(
            req.params.id,
            {
                title: req.body.title,
                text: req.body.text
            },
            {
                returnDocument: "after"
            }
        );

        res.json({
            success: true,
            data: message
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};


const deleteQuickMessage = async (req, res) => {
    try {

        await QuickMessage.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: "Message deleted"
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};


module.exports = {
    getQuickLinks,
    createQuickLink,
    updateQuickLink,
    deleteQuickLink,
    getQuickMessages,
    createQuickMessage,
    updateQuickMessage,
    deleteQuickMessage
};