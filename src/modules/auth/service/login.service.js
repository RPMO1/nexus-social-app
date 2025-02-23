import { providerTypes, roleTypes, userModel } from "../../../DB/model/User.model.js";
import { emailEvent } from "../../../utils/events/email.event.js";
import { asyncHandler } from "../../../utils/response/error.response.js";
import { successResponse } from "../../../utils/response/success.response.js";
import { compareHash, generateHash } from "../../../utils/security/hash.security.js";
import { decodeToken, generateToken, tokenTypes, verifyToken } from "../../../utils/security/token.security.js";
import * as dbServices from "../../../DB/db.service.js";
import { OAuth2Client } from 'google-auth-library';
import { decodeEncryption } from "../../../utils/security/encryption.security.js";


export const login = asyncHandler(
    async (req, res, next) => {
        const { email, phone, password } = req.body;

        if (!email && !phone) {
            return next(new Error("Email or Phone is required", { cause: 400 }));
        }

        // Find the user based on either email OR phone
        const user = await dbServices.findOne({
            model: userModel,
            filter: email ? { email } : { phone }
        });
        // console.log("Fetched User:", user);

        if (!user) {
            return next(new Error("User Not Found", { cause: 404 }));
        }

        if (phone) {
            if (user.phone !== phone) {
                return next(new Error("User Not Found", { cause: 404 }));
            }
        }

        if (!user.confirmEmail) {
            return next(new Error("Please Verify Your Account First", { cause: 400 }))
        }

        if (user.provider != providerTypes.system) {
            return next(new Error("Invalid Login Method", { cause: 400 }))
        }


        if (!compareHash({ plaintext: password, hashValue: user.password })) {
            return next(new Error("Invalid Password", { cause: 400 }))
        }
        // If 2FA is enabled, generate and send OTP
        if (user.twoFAEnabled) {
            emailEvent.emit("sendConfirmEmail", { id: user._id, email })
            return successResponse({ res, message: "OTP sent to your email. Please verify to complete login." });
        }

        const access_Token = generateToken({ payload: { id: user._id }, signature: user.role !== roleTypes.user ? process.env.SYSTEM_ACCESS_TOKEN : process.env.USER_ACCESS_TOKEN })
        const refreshToken = generateToken({ payload: { id: user._id }, signature: user.role !== roleTypes.user ? process.env.SYSTEM_REFRESH_TOKEN : process.env.USER_REFRESH_TOKEN, expiresIn: 31536000 })

        console.log({ access_Token, refreshToken })
        return successResponse({ res, status: 201, data: { token: { access_Token, refreshToken } } })
    }
)

// Endpoint to verify OTP for login
export const verifyLoginOTP = asyncHandler(async (req, res, next) => {
    const { email, code } = req.body;

    const user = await dbServices.findOne({ model: userModel, filter: { email, twoFAEnabled: true } });
    console.log(user)
    if (!user) {
        return next(new Error("In-valid Account", { cause: 404 }));
    }

    // Check OTP expiration
    if (Date.now() > user.emailOTPExpire) {
        return next(new Error("verification code is expired", { cause: 400 }));
    }

    if (!compareHash({ plaintext: code, hashValue: user.emailOTP })) {
        return next(new Error("Invalid verification OTP code ", { cause: 400 }));
    }

    await dbServices.updateOne({
        model: userModel,
        filter: { _id: user._id },
        data: {
            $unset: { emailOTP: 1, emailOTPExpire: 1 }
        },
    });

    const accessToken = generateToken({ payload: { id: user._id }, signature: user.role === roleTypes.admin ? process.env.SYSTEM_ACCESS_TOKEN : process.env.USER_ACCESS_TOKEN })
    const refreshToken = generateToken({ payload: { id: user._id }, signature: user.role === roleTypes.admin ? process.env.SYSTEM_REFRESH_TOKEN : process.env.USER_REFRESH_TOKEN, expiresIn: 31536000 })

    return successResponse({ res, status: 201, data: { token: { accessToken, refreshToken } } })
});


export const loginWithGmail = asyncHandler(
    async (req, res, next) => {
        const { idToken } = req.body;

        const client = new OAuth2Client();
        async function verify() {
            const ticket = await client.verifyIdToken({
                idToken,
                audience: process.env.CLIENT_ID,
            });
            const payload = ticket.getPayload();
            return payload;
        }

        const { email_verified, email, name, picture } = await verify();
        if (!email_verified) {
            return next(new Error("In-valid Account", { cause: 404 }))
        }

        let user = await dbServices.findOne({ model: userModel, filter: { email } })
        if (user?.provider === providerTypes.system) {
            return next(new Error("In-valid login provider", { cause: 409 }))
        }

        if (!user) {
            user = await dbServices.create({ model: userModel, data: { confirmEmail: email_verified, email, userName: name, image: picture, provider: providerTypes.google } })
        }

        const accessToken = generateToken({ payload: { id: user._id }, signature: user.role === roleTypes.admin ? process.env.SYSTEM_ACCESS_TOKEN : process.env.USER_ACCESS_TOKEN })
        const refreshToken = generateToken({ payload: { id: user._id }, signature: user.role === roleTypes.admin ? process.env.SYSTEM_REFRESH_TOKEN : process.env.USER_REFRESH_TOKEN, expiresIn: 31536000 })

        return successResponse({ res, status: 201, data: { token: { accessToken, refreshToken } } })
    }
)


export const refreshToken = asyncHandler(
    async (req, res, next) => {
        const user = await decodeToken({ authorization: req.headers.authorization, tokenType: tokenTypes.refresh, next })

        const accessToken = generateToken({ payload: { id: user._id }, signature: user.role === roleTypes.admin ? process.env.SYSTEM_ACCESS_TOKEN : process.env.USER_ACCESS_TOKEN })
        const refreshToken = generateToken({ payload: { id: user._id }, signature: user.role === roleTypes.admin ? process.env.SYSTEM_REFRESH_TOKEN : process.env.USER_REFRESH_TOKEN, expiresIn: 31536000 })

        return successResponse({ res, status: 201, data: { token: { accessToken, refreshToken } } })
    }
)

export const forgetPassword = asyncHandler(async (req, res, next) => {
    const { email } = req.body;

    // Find user in the database
    const user = await dbServices.findOne({
        model: userModel,
        filter: { email, isDeleted: { $exists: false } }
    });

    if (!user) {
        return next(new Error("Invalid Account", { cause: 404 }));
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


    // Emit event to send the OTP email
    emailEvent.emit("forgetPassword", { id: user._id, email });

    // Update resend attempt count
    await dbServices.updateOne({
        model: userModel,
        filter: { email },
        data: {
            lastResendAttempt: Date.now(),
            $inc: { resendOTPAttempts: 1 }
        }
    });

    return successResponse({ res, message: "OTP sent successfully" });
});


export const resetPassword = asyncHandler(
    async (req, res, next) => {
        const { email, code, password } = req.body;

        const user = await dbServices.findOne({ model: userModel, filter: { email, isDeleted: { $exists: false } } });
        if (!user) {
            return next(new Error("In-valid Account", { cause: 404 }))
        }

        if (!compareHash({ plaintext: code, hashValue: user.emailOTP })) {
            return next(new Error("In-valid OTP Code", { cause: 400 }))
        }

        if (user.emailOTPExpire < Date.now()) {
            return next(new Error("Expired OTP Code"), { cause: 400 })
        }

        const hashedPassword = generateHash({ plaintext: password });
        await dbServices.updateOne({
            model: userModel,
            filter: { email },
            data: {
                password: hashedPassword,
                confirmEmail: true,
                credentialsChangeTime: Date.now(),
                resendOTPAttempts: 0,
                $unset: { emailOTP: 1, emailOTPExpire: 1, lastResendAttempt: 1 }
            }
        })
        return successResponse({ res })
    })



