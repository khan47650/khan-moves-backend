const axios = require('axios');
const qs = require('qs');

async function sendWhatsApp(to, message) {
    try {
        const data = qs.stringify({
            token: process.env.ULTRAMSG_TOKEN,
            to: to,
            body: message,
        });

        const config = {
            method: 'post',
            url: `https://api.ultramsg.com/${process.env.ULTRAMSG_INSTANCE_ID}/messages/chat`,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            data: data,
        };

        const response = await axios(config);
        console.log('WhatsApp sent:', JSON.stringify(response.data));
        return true;
    } catch (err) {
        console.error('WhatsApp send error:', err);
        return false;
    }
}

async function sendWhatsAppDocument(to, base64, filename, caption = '') {
    try {
        const response = await axios.post(
            `https://api.ultramsg.com/${process.env.ULTRAMSG_INSTANCE_ID}/messages/document`,
            {
                token: process.env.ULTRAMSG_TOKEN,
                to: to,
                document: `data:application/pdf;base64,${base64}`,
                filename: filename,
                caption: caption,
            },
            {
                headers: { 'Content-Type': 'application/json' },
            }
        );
        console.log('WhatsApp document sent:', JSON.stringify(response.data));
        return true;
    } catch (err) {
        console.error('WhatsApp document error:', err.response?.data || err.message);
        return false;
    }
}
module.exports = { sendWhatsApp, sendWhatsAppDocument };