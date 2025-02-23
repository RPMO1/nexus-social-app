import { userModel } from "../../../DB/model/User.model.js"
import { emailEvent } from "../../../utils/events/email.event.js";
import { asyncHandler } from "../../../utils/response/error.response.js"
import { successResponse } from "../../../utils/response/success.response.js";
import { compareHash, generateHash } from "../../../utils/security/hash.security.js"
import * as dbServices from "../../../DB/db.service.js"
import { generateEncryption } from "../../../utils/security/encryption.security.js";




export const signup = asyncHandler(
    async (req, res, next) => {
        const { userName, email, password } = req.body;
        if (await dbServices.findOne({ model: userModel, filter: { email } })) {
            return next(new Error("Email Alrady Exists", { cause: 409 }))
        }

        const hashPassword = generateHash({ plaintext: password })
        const user = await dbServices.create({
            model: userModel,
            data: { userName, email, password: hashPassword }
        })
        emailEvent.emit("sendConfirmEmail", { id: user._id, email })
        return successResponse({ res, status: 201, data: { user: user._id } })
    }
)

export const confirmEmail = asyncHandler(async (req, res, next) => {
    const { email, code } = req.body;
    const user = await dbServices.findOne({ model: userModel, filter: { email } });

    if (!user) {
        return next(new Error("User not found", { cause: 404 }));
    }

    if (user.confirmEmail) {
        return next(new Error("User Account Already Confirmed", { cause: 409 }));
    }

    //check otp expiry
    if (Date.now() > user.emailOTPExpire) {
        return next(new Error("Old email verification code has expired", { cause: 400 }));
    }

    if (!compareHash({ plaintext: `${code}`, hashValue: user.emailOTP })) {
        return next(new Error("In-valid otp", { cause: 404 }));
    }

    // Reset resend attempts after successful confirmation
    await dbServices.updateOne({
        model: userModel,
        filter: { email },
        data: { confirmEmail: true, resendOTPAttempts: 0, $unset: { emailOTP: 1, emailOTPExpire: 1, lastResendAttempt: 1 } }
    });
    return successResponse({ res, status: 200, data: { user } })
});


export const resendConfirmEmail = asyncHandler(async (req, res, next) => {
    const { email } = req.body;

    const user = await dbServices.findOne({ model: userModel, filter: { email } });
    if (!user) {
        return next(new Error("User not found", { cause: 404 }));
    }

    if (user.confirmEmail) {
        return next(new Error("User Account Already Confirmed", { cause: 409 }));
    }

    // Check if previous OTP is still valid
    if (user.emailOTPExpire && Date.now() < user.emailOTPExpire) {
        return next(new Error("OTP is still valid, no need to resend", { cause: 400 }));
    }

    // Check if the user is still within the 5 resend attempts 
    if (user.resendOTPAttempts >= 5) {
        const currentTime = Date.now();
        const timeGap = currentTime - user.lastResendAttempt;

        // If time gap less than 5 minutes since the last resend attempt
        if (timeGap < 5 * 60 * 1000) {
            return next(new Error("You have exceeded the maximum number of attempts. Please wait 5 minutes before retrying.", { cause: 429 }));
        } else {
            await dbServices.updateOne({
                model: userModel,
                filter: { email },
                data: { $set: { resendOTPAttempts: 0 }, $unset: { lastResendAttempt: 1 } }
            });
        }
    }

    //Resend confirm email & reset related data
    emailEvent.emit("sendConfirmEmail", { id: user._id, email });
    await dbServices.updateOne({
        model: userModel,
        filter: { email },
        data: {
            lastResendAttempt: Date.now(),
            $inc: { resendOTPAttempts: 1 }
        }
    });

    return successResponse({ res, status: 200, message: "OTP sent successfully" });
});





