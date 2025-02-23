import { asyncHandler } from "../../../utils/response/error.response.js";
import { successResponse } from "../../../utils/response/success.response.js";
import * as dbServices from "../../../DB/db.service.js"
import { postModel } from "../../../DB/model/Post.model.js"
import { commentModel } from "../../../DB/model/Comment.model.js";
import cloud from "../../../utils/multer/cloudinary.js"
import { roleTypes } from "../../../DB/model/User.model.js";

export const createComment = asyncHandler(async (req, res, next) => {
    const { postId, commentId } = req.params

    if (commentId) {
        const checkComment = await dbServices.findOne({
            model: commentModel,
            filter: { _id: commentId, isDeleted: { $exists: false } }
        })
        if (!checkComment) {
            return next(new Error("Cannot reply on an in-valid comment", { cause: 404 }))
        }
        req.body.commentId = commentId
    }
    const post = await dbServices.findOne({
        model: postModel,
        filter: { _id: postId, isDeleted: { $exists: false }, isArchived: { $exists: false } }
    })
    if (!post) {
        return next(new Error("In-valid post", { cause: 404 }))
    }

    if (req.files?.length) {
        const attachments = []
        for (const file of req.files) {
            const { secure_url, public_id } = await cloud.uploader.upload(file.path, {
                folder: `${process.env.APP_NAME}/user/post/${post.userId}/comment`
            })
            attachments.push({ secure_url, public_id })
        }
        req.body.attachments = attachments
    }

    const comment = await dbServices.create({
        model: commentModel,
        data: {
            ...req.body,
            postId,
            userId: req.user._id
        }
    })

    return successResponse({ res, satus: 201, data: { comment } })
});


export const updateComment = asyncHandler(async (req, res, next) => {
    const { postId, commentId } = req.params
    const comment = await dbServices.findOne({
        model: commentModel,
        filter: {
            _id: commentId,
            postId,
            isDeleted: { $exists: false },
            isArchived: { $exists: false },
        },
        populate: {
            path: "postId"
        }
    })
    if (!comment || comment.postId.isDeleted) {
        return next(new Error("In-valid Comment", { cause: 404 }))
    }

    // Delete old attachments from Cloudinary if they exist
    if (comment.attachments?.length) {
        for (const attachment of comment.attachments) {
            await cloud.uploader.destroy(attachment.public_id); // Delete old files
        }
    }

    // Upload new attachments to Cloudinary
    let newAttachments = [];
    if (req.files?.length) {
        for (const file of req.files) {
            const { secure_url, public_id } = await cloud.uploader.upload(file.path, { folder: `${process.env.APP_NAME}/user/post/${comment.postId.userId}/comment` });
            newAttachments.push({ secure_url, public_id });
        }
        req.body.attachments = newAttachments
    }

    // Update the comment with new data
    const updatedComment = await dbServices.findOneAndUpdate({
        model: commentModel,
        filter: {
            _id: commentId,
            postId,
            isDeleted: { $exists: false },
            isArchived: { $exists: false },
        },
        data: req.body,
        options: { new: true }
    });
    return successResponse({ res, status: 201, data: { comment: updatedComment } })
})


export const freezeComment = asyncHandler(async (req, res, next) => {
    const { postId, commentId } = req.params;

    const comment = await dbServices.findOne({
        model: commentModel,
        filter: {
            _id: commentId,
            postId,
            isDeleted: { $exists: false }
        },
        populate: [{
            path: "postId"
        }]
    })

    if (
        !comment ||
        (
            req.user.role !== roleTypes.admin &&
            req.user._id.toString() !== comment.userId.toString() &&
            req.user._id.toString() !== comment.postId.userId.toString()
        )

    ) {
        return next(new Error("In-valid comment or not authorized user", { cause: 404 }))
    }

    const savedComment = await dbServices.findOneAndUpdate({
        model: commentModel,
        filter: {
            _id: commentId,
            postId,
            isDeleted: { $exists: false }
        },
        data: {
            isDeleted: Date.now(),
            deletedBy: req.user._id
        },
        options: {
            new: true
        }
    })

    return successResponse({ res, status: 201, data: { savedComment } })
})

export const unfreezeComment = asyncHandler(async (req, res, next) => {
    const { postId, commentId } = req.params;

    const savedComment = await dbServices.findOneAndUpdate({
        model: commentModel,
        filter: {
            _id: commentId,
            postId,
            isDeleted: { $exists: true },
            deletedBy: req.user._id
        },
        data: {
            $unset: {
                isDeleted: 1,
                deletedBy: 1
            }

        },
        options: {
            new: true
        }
    })
    if (!savedComment) {
        return next(new Error("In-valid comment or not authorized user", { cause: 404 }))
    }


    return successResponse({ res, status: 201, data: { savedComment } })
})