import joi from "joi"
import { generalFields } from "../../middleware/validation.middlware.js"

export const signup = joi.object().keys({
    userName: generalFields.userName.required(),
    email: generalFields.email.required(),
    password: generalFields.password.required(),
    confirmationPassword: generalFields.confirmationPassword.valid(joi.ref('password')).required(),
}).required()

export const confirmEmail = joi.object().keys({
    email: generalFields.email.required(),
    code: generalFields.code.required()
}).required()

export const resendConfirmEmail = joi.object().keys({
    email: generalFields.email.required(),
}).required()

export const login = joi.object().keys({
    email: generalFields.email,
    phone: generalFields.phone,
    password: generalFields.password.required(),
}).xor("email", "phone"); // Only one is allowed, not both


export const forgetPassword = joi.object().keys({
    email: generalFields.email.required(),
}).required()

export const resetPassword = joi.object().keys({
    email: generalFields.email.required(),
    code: generalFields.code.required(),
    password: generalFields.password.required(),
    confirmationPassword: generalFields.confirmationPassword.valid(joi.ref('password')).required()
}).required()

export const verifyLoginOTP = joi.object().keys({
    email: generalFields.email.required(),
    code: generalFields.code.required()
}).required()