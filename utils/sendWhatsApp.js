const axios = require("axios");

const OPENWA_BASE_URL =
    process.env.OPENWA_BASE_URL || "http://localhost:2785";

const OPENWA_API_KEY = process.env.OPENWA_API_KEY;
const OPENWA_SESSION_ID = process.env.OPENWA_SESSION_ID;

const openwa = axios.create({
    baseURL: OPENWA_BASE_URL,
    headers: {
        "X-API-Key": OPENWA_API_KEY,
        "Content-Type": "application/json",
    },
    timeout: 30000,
});

function formatChatId(phone) {
    let number = String(phone || "").replace(/\D/g, "");

    if (!number) {
        throw new Error("Invalid WhatsApp phone number");
    }

    // Pakistan local number: 03xxxxxxxxx -> 923xxxxxxxxx
    if (number.startsWith("03")) {
        number = "92" + number.substring(1);
    }

    // UK local mobile: 07xxxxxxxxx -> 447xxxxxxxxx
    else if (number.startsWith("07")) {
        number = "44" + number.substring(1);
    }

    // Already international Pakistan/UK numbers remain unchanged
    // 923xxxxxxxxx
    // 447xxxxxxxxx

    return `${number}@c.us`;
}

async function sendWhatsApp(to, message) {
    try {
        const chatId = formatChatId(to);

        const response = await openwa.post(
            `/api/sessions/${OPENWA_SESSION_ID}/messages/send-text`,
            {
                chatId,
                text: message,
            }
        );

        console.log("WhatsApp sent:", response.data);

        return true;
    } catch (err) {
        console.error(
            "WhatsApp send error:",
            err.response?.data || err.message
        );

        return false;
    }
}

async function sendWhatsAppDocument(
    to,
    base64,
    filename,
    caption = ""
) {
    try {
        const chatId = formatChatId(to);

        const response = await openwa.post(
            `/api/sessions/${OPENWA_SESSION_ID}/messages/send-document`,
            {
                chatId,
                base64,
                mimetype: "application/pdf",
                filename: filename || "invoice.pdf",
                caption,
            }
        );

        console.log(
            "WhatsApp document sent:",
            response.data
        );

        return true;
    } catch (err) {
        console.error(
            "WhatsApp document error:",
            err.response?.data || err.message
        );

        return false;
    }
}

module.exports = {
    sendWhatsApp,
    sendWhatsAppDocument,
};