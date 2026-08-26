const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.ZOHO_SMTP_HOST,
  port: Number(process.env.ZOHO_SMTP_PORT),
  secure: true,
  auth: {
    user: process.env.ZOHO_SMTP_USER,
    pass: process.env.ZOHO_SMTP_PASSWORD,
  },
});

/**
 * Send email using Zoho SMTP
 *
 * @param {string} to - Receiver email
 * @param {string} subject - Email subject
 * @param {string} html - Email HTML
 * @param {Array} attachments - Email attachments
 * @param {string} fromType - "info" | "noreply" | "bookings"
 */
async function sendEmail(
  to,
  subject,
  html,
  attachments = [],
  fromType = "info"
) {
  try {
    let fromEmail;
    let fromName = "Khan Moves";

    switch (fromType) {
      case "noreply":
        fromEmail = process.env.ZOHO_FROM_NOREPLY;
        break;

      case "bookings":
        fromEmail = process.env.ZOHO_FROM_BOOKINGS;
        break;

      case "info":
      default:
        fromEmail = process.env.ZOHO_FROM_INFO;
        break;
    }

    const mailOptions = {
      from: {
        name: fromName,
        address: fromEmail,
      },

      to,

      subject,

      html,

      attachments: attachments.map((file) => ({
        filename: file.filename,
        content: file.content,
      })),
    };

    const info = await transporter.sendMail(mailOptions);

    console.log(
      `Email sent successfully from ${fromEmail}:`,
      info.messageId
    );

    return true;
  } catch (err) {
    console.error(
      "Zoho email send error:",
      err.response || err.message
    );

    throw err;
  }
}

module.exports = sendEmail;