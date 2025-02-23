import joi from "joi";
import { generalFields } from "../../middleware/validation.middlware.js";

export const shareProfile = joi.object().keys({
    profileId: generalFields.id.required()
}).required()

export const updateBasicProfile = joi.object().keys({
    userName: generalFields.userName,
    DOB: generalFields.DOB,
    phone: generalFields.phone,
    gender: generalFields.gender
}).required()

export const updatePassword = joi.object().keys({
    oldPassword: generalFields.password.required(),
    password: generalFields.password.not(joi.ref("oldPassword")).required(),
    confirmationPassword: generalFields.confirmationPassword.valid(joi.ref("password")).required()
}).required()

export const updateEmail = joi.object().keys({
    email: generalFields.email.required()
}).required()

export const resendUpdateEmailOTP = joi.object().keys({
    oldEmail: generalFields.email.required(),
    newEmail: generalFields.email.required(),
}).required()

export const verifyTwoStepVerificationOTP = joi.object().keys({
    code: generalFields.code.required(),
}).required()
