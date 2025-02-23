import { Router } from 'express'
import * as registrationService from './service/registration.service.js';
import * as loginService from './service/login.service.js';
import { validation } from '../../middleware/validation.middlware.js';
import * as validators from "./auth.validation.js"

const router = Router();


router.post("/signup", validation(validators.signup), registrationService.signup);
router.patch("/confirm-email", validation(validators.confirmEmail), registrationService.confirmEmail);
router.patch("/resend-confirm-email", validation(validators.resendConfirmEmail), registrationService.resendConfirmEmail);

router.post("/login", validation(validators.login), loginService.login);
router.patch("/verify-login-otp", validation(validators.verifyLoginOTP), loginService.verifyLoginOTP);
router.post("/loginWithGmail", loginService.loginWithGmail);
router.get("/refresh-token", loginService.refreshToken);

router.patch("/forgot-password", validation(validators.forgetPassword), loginService.forgetPassword);
router.patch("/reset-password", validation(validators.resetPassword), loginService.resetPassword);


export default router