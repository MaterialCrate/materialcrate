import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: "email-smtp.eu-north-1.amazonaws.com",
  port: 587,
  auth: {
    user: process.env.SES_USER,
    pass: process.env.SES_PASS,
  },
});
