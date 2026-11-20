const nodemailer = require('nodemailer');

// Sends an email through your SMTP account. With no SMTP_HOST set, the email is printed in the terminal instead (for testing).
exports.sendMail = async (to, subject, text) => {
  if (!process.env.SMTP_HOST) {
    console.log(`\n[Email -> ${to}] ${subject}\n${text}\n`);
    return;
  }
  try {
    const port = Number(process.env.SMTP_PORT) || 465;
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
    await transport.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject, text });
  } catch (e) {
    console.error('Email failed:', e.message); // never block signup or login because of a mail failure
  }
};
