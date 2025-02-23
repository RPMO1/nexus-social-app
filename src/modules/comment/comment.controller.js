import * as commentServices from "./services/comment.service.js"
import { authentication, authorization } from "../../middleware/auth.middlware.js";
import { endpoint } from "./comment.authorization.endpoint.js";
import { uploadCloudFile } from "../../utils/multer/cloud.multer.js";
import { fileValidationTypes } from "../../utils/multer/local.multer.js";
import * as validatiors from "./comment.validation.js"
import { Router } from "express"
import { validation } from "../../middleware/validation.middlware.js";

const router = Router({ mergeParams: true, caseSensitive: true })

router.post("/:commentId?",
    authentication(),
    authorization(endpoint.create),
    uploadCloudFile(fileValidationTypes.image).array('attachments', 2),
    validation(validatiors.createComment),
    commentServices.createComment
)

router.patch("/:commentId",
    authentication(),
    authorization(endpoint.update),
    uploadCloudFile(fileValidationTypes.image).array('attachments', 2),
    validation(validatiors.updateComment),
    commentServices.updateComment
)

router.delete("/:commentId",
    authentication(),
    authorization(endpoint.freeze),
    validation(validatiors.freezeComment),
    commentServices.freezeComment
)

router.patch("/:commentId/restore",
    authentication(),
    authorization(endpoint.freeze),
    validation(validatiors.freezeComment),
    commentServices.unfreezeComment
)

export default router