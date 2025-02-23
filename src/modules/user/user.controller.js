import { authentication, authorization } from "../../middleware/auth.middlware.js";
import { validation } from "../../middleware/validation.middlware.js";
import { uploadCloudFile } from "../../utils/multer/cloud.multer.js";
import { fileValidationTypes, uploadDiskFile } from "../../utils/multer/local.multer.js";
import * as userServices from "../user/services/user.service.js"
import { endpoint } from "./user.authorization.endpoint.js";
import * as validators from "./user.validation.js"
import { Router } from "express"
const router = Router()


router.get('/profile', authentication(), userServices.profile)
router.get('/profile/:profileId', validation(validators.shareProfile), authentication(), userServices.shareProfile)
router.post('/profile/block-user', validation(validators.updateEmail), authentication(), userServices.blockUser)
router.patch('/profile/friends/:friendId/add', authentication(), userServices.sendFriendRequest)
router.patch('/profile/friends/:friendRequestId/accept', authentication(), userServices.acceptFriendRequest)

router.patch('/profile', validation(validators.updateBasicProfile), authentication(), userServices.updateBasicProfile)
router.patch('/profile/password', validation(validators.updatePassword), authentication(), userServices.updatePassword)

router.patch('/profile/email', validation(validators.updateEmail), authentication(), userServices.updateEmail)
router.patch('/profile/replace-email', validation(validators.replaceEmail), authentication(), userServices.replaceEmail)
router.patch("/resend-update-email-otps", validation(validators.resendUpdateEmailOTP), userServices.resendUpdateEmailOTP);

router.patch('/enable-two-step-verification', authentication(), userServices.enableTwoStepVerification)
router.patch('/verify-two-step-verification', validation(validators.verifyTwoStepVerificationOTP), authentication(), userServices.verifyTwoStepVerificationOTP)


router.patch('/profile/image',
    authentication(),
    // uploadDiskFile("user/profile",fileValidationTypes.image).single('image'),
    uploadCloudFile(fileValidationTypes.image).single('image'),
    userServices.uploadImage
);

router.patch('/profile/image/cover',
    authentication(),
    // uploadDiskFile("user/profile/cover", fileValidationTypes.image).array('image', 5),
    uploadCloudFile(fileValidationTypes.image).array('image', 3),

    userServices.coverImages
);


router.get('/profile/admin/dashboard',
    authentication(),
    authorization(endpoint.admin),
    userServices.dashboard
);

router.patch('/profile/admin/role',
    authentication(),
    authorization(endpoint.admin),
    userServices.changePrivileges
);





export default router;