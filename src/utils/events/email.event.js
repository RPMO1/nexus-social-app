import { nanoid, customAlphabet } from "nanoid";
import { EventEmitter } from "node:events";
import { verificationEmailTemplate } from "../email/template/verify.email.js";
import { forgetPasswordTemplate } from "../email/template/forgetPassword.email.js";
import { sendEmail, subjectTypes } from "../email/send.email.js";
import { generateHash } from "../security/hash.security.js";
import { userModel } from "../../DB/model/User.model.js";
import * as dbServices from "../../DB/db.service.js"

export const emailEvent = new EventEmitter({})

const sendCode = async ({ data, subject = subjectTypes.confirmEmail } = {}) => {
    const { id, email } = data
    const otp = customAlphabet("0123456789", 4)();
    const html = verificationEmailTemplate({ code: otp })
    const hash = generateHash({ plaintext: `${otp}` })
    const expiry = Date.now() + (2 * 60 * 1000); // 2-min expiration

    let dataUpdate = {};

    switch (subject) {
        case subjectTypes.confirmEmail:
            dataUpdate = { emailOTP: hash, emailOTPExpire: expiry };
            break;
        case subjectTypes.forgetPassword:
            dataUpdate = { emailOTP: hash, emailOTPExpire: expiry };
            break;
        case subjectTypes.updateEmail:
            dataUpdate = { updateEmailOTP: hash, updateEmailOTPExpire: expiry };
            break;
        case subjectTypes.enable2FA:
            dataUpdate = { twoFAOTP: hash, twoFAOTPExpire: expiry };
            break;
        default:
            break;
    }
    await dbServices.updateOne({
        model: userModel,
        filter: { _id: id },
        data: dataUpdate
    });

    await sendEmail({ to: email, subject, html })
}


emailEvent.on("sendConfirmEmail", async (data) => {
    await sendCode(({ data, subject: subjectTypes.confirmEmail }));
});
emailEvent.on("forgetPassword", async (data) => {
    await sendCode(({ data, subject: subjectTypes.forgetPassword }));
});

emailEvent.on("updateEmail", async (data) => {
    await sendCode(({ data, subject: subjectTypes.updateEmail }));
});

emailEvent.on("enable2FA", async (data) => {
    await sendCode(({ data, subject: subjectTypes.enable2FA }));
});



emailEvent.on("sendProfileViewEmail", async (data) => {
    const { email, userName, viewTimes } = data;

    // Format view times into readable format
    const formattedTimes = viewTimes.map(time => new Date(time).toLocaleString()).join("\n");

    const html = `
        <p>${userName} has viewed your account 5 times at these time periods:</p>
        <pre>${formattedTimes}</pre>
    `;

    // Send the email
    await sendEmail({ to: email, subject: "Profile Viewed 5 Times", html });
    console.log("Profile view email sent");
});

