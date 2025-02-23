import { authentication, authorization } from "../../middleware/auth.middlware.js";
import { validation } from "../../middleware/validation.middlware.js";
import { uploadCloudFile } from "../../utils/multer/cloud.multer.js";
import { fileValidationTypes } from "../../utils/multer/local.multer.js";
import { endpoint } from "./post.authorization.endpoint.js"
import * as validators from "./post.validation.js"
import * as postService from "../post/services/post.service.js"
import { Router } from "express"
import commentController from "../comment/comment.controller.js"
const router = Router({ caseSensitive: true })


router.use("/:postId/comment", commentController)

router.get("/",
    authentication(),
    // authorization(endpoint.getAllPosts),
    postService.gelAllPosts
)

router.get("/friends",
    authentication(),
    authorization(endpoint.getFriendsPublicPosts),
    postService.getFriendsPublicPosts
);

router.get("/specific",
    authentication(),
    authorization(endpoint.getSpecificUserPosts),
    postService.getSpecificUserPosts
);

router.get("/:userId",
    authentication(),
    authorization(endpoint.getUserPublicPosts),
    postService.getUserPublicPosts
);




router.post("/",
    authentication(),
    authorization(endpoint.createPost),
    uploadCloudFile(fileValidationTypes.image).array('image', 2),
    validation(validators.createPost),
    postService.createPost
)

router.delete("/:postId/undo",
    authentication(),
    authorization(endpoint.undoPost),
    validation(validators.undoPost),
    postService.undoPost
)

router.patch("/:postId/archive",
    authentication(),
    authorization(endpoint.archivePost),
    validation(validators.archivePost),
    postService.archivePost
)

router.patch("/:postId/update",
    authentication(),
    authorization(endpoint.updatePost),
    uploadCloudFile(fileValidationTypes.image).array('image', 2),
    validation(validators.updatePost),
    postService.updatePost
)

router.delete("/:postId/freeze",
    authentication(),
    authorization(endpoint.freezePost),
    validation(validators.freezePost),
    postService.freezePost
)

router.patch("/:postId/restore",
    authentication(),
    authorization(endpoint.freezePost),
    validation(validators.freezePost),
    postService.restorePost
)

router.patch("/:postId/like",
    authentication(),
    authorization(endpoint.likePost),
    validation(validators.likePost),
    postService.likePost
)



export default router