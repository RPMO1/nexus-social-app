import nodemailer from "nodemailer"

export const subjectTypes = {
    confirmEmail: "Confirm-Email",
    updateEmail: "Update-Email",
    forgetPassword: "forget-password",
    enable2FA: "Two-Step Verification",
}

export const sendEmail = async ({
    to = [],
    cc = [],
    bcc = [],
    subject = "Nexus",
    text = "",
    html = "",
    attachments = []
} = {}) => {

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL,
            pass: process.env.EMAIL_PASSWORD,
        },
    });

    // send mail with defined transport object
    const info = await transporter.sendMail({
        from: `"Nexus" <${process.env.EMAIL}>`, // sender address
        to,
        cc,
        bcc,
        subject,
        text,
        html,
        attachments
    });

    console.log("Message sent: %s", info.messageId);

}