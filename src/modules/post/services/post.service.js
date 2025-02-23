import { asyncHandler } from "../../../utils/response/error.response.js";
import cloud from '../../../utils/multer/cloudinary.js'
import * as dbServices from "../../../DB/db.service.js"
import { postModel, privacyTypes } from "../../../DB/model/Post.model.js"
import { successResponse } from "../../../utils/response/success.response.js";
import { roleTypes, socketConnections, userModel } from "../../../DB/model/User.model.js";
import { paginate } from "../../../utils/pagination.js";
import { getIo } from "../../chat/chat.socket.controller.js";


const populateList = [
    { path: 'userId', select: 'userName image' },
    { path: 'likes', select: 'userName image' },
    {
        path: 'comments',
        match: { isDeleted: { $exists: false }, commentId: { $exists: false } },
        populate: {
            path: "reply",
            match: { commentId: { $exists: false } },
            populate: {
                path: "reply",
                match: { commentId: { $exists: false } }
            }
        }
    },
    { path: 'share', select: 'userName image' },
    { path: 'tags', select: 'userName image' },
]

export const gelAllPosts = asyncHandler(async (req, res, next) => {
    const { page, size } = req.query

    const data = await paginate({
        model: postModel,
        filter: { isDeleted: { $exists: false }, isArchived: { $exists: false } },
        page,
        size: size,
        populate: populateList,
    })
    return successResponse({ res, data })
})


export const getUserPublicPosts = asyncHandler(async (req, res, next) => {
    // Fetch the requesting user's blocked users list
    const user = await dbServices.findById({
        model: userModel,
        id: req.user._id,
        select: "blockedUsers"
    });

    // Fetch the post owner's blocked users list
    const postsOwner = await dbServices.findById({
        model: userModel,
        id: req.params.userId,
        select: "blockedUsers"
    });

    // Check if the requesting user or post owner has blocked each other
    if (user.blockedUsers.includes(req.params.userId) || postsOwner.blockedUsers.includes(req.user._id)) {
        return next(new Error("Access denied. You have been blocked or have blocked this user.", { cause: 403 }));
    }
    const posts = await dbServices.findAll({
        model: postModel,
        filter: {
            userId: req.params.userId,
            privacy: privacyTypes.public,
            isDeleted: { $exists: false },
            isArchived: { $exists: false },
        },
        populate: populateList,
    });

    return successResponse({ res, data: { posts } });
});

export const getFriendsPublicPosts = asyncHandler(async (req, res, next) => {
    const user = await dbServices.findById({
        model: userModel,
        id: req.user._id,
        select: "friends"
    });

    if (!user) {
        return next(new Error("User not found", { cause: 404 }));
    }

    // Fetch only friends-only posts from friends
    const posts = await dbServices.findAll({
        model: postModel,
        filter: {
            privacy: privacyTypes.friends,
            userId: { $in: user.friends },
            isDeleted: { $exists: false },
            isArchived: { $exists: false },
        },
        populate: populateList,
    });

    return successResponse({ res, data: { posts } });
});


export const getSpecificUserPosts = asyncHandler(async (req, res, next) => {
    const user = await userModel.findById(req.user._id).select("_id");

    if (!user) {
        return next(new Error("User not found", { cause: 404 }));
    }

    // Fetch only posts with privacy = specific where the logged-in user is in specificUsers
    const posts = await dbServices.findAll({
        model: postModel,
        filter: {
            privacy: privacyTypes.specific,
            specificUsers: user._id,
            isDeleted: { $exists: false },
            isArchived: { $exists: false },
        },
        populate: populateList,
    });

    return successResponse({ res, data: { posts } });
});



export const createPost = asyncHandler(async (req, res, next) => {
    if (req.files) {
        const attachments = []
        for (const file of req.files) {
            const { secure_url, public_id } = await cloud.uploader.upload(file.path, { folder: "post" })
            attachments.push({ secure_url, public_id })
        }
        req.body.attachments = attachments
    }

    const post = await dbServices.create({
        model: postModel,
        data: { ...req.body, userId: req.user._id }
    })
    return successResponse({ res, status: 201, data: { post } })
})

export const undoPost = asyncHandler(async (req, res, next) => {
    const { postId } = req.params;

    const post = await postModel.findOne({ _id: postId, userId: req.user._id });
    if (!post) {
        return next(new Error("Invalid post ID or no permission", { cause: 404 }));
    }

    // Calculate time gap
    const timeGap = (Date.now() - post.createdAt.getTime()) / 1000; // In seconds
    console.log(timeGap)
    if (timeGap > 120) {   //2 minutes
        return next(new Error("Unfortunately undo period expired, you can't undo this post now", { cause: 400 }));
    }

    // Delete post attachments from Cloudinary if any
    if (post.attachments && post.attachments.length > 0) {
        for (const attachment of post.attachments) {
            await cloud.uploader.destroy(attachment.public_id);
        }
    }

    await postModel.deleteOne({ _id: postId });

    return successResponse({ res });
});

export const archivePost = asyncHandler(async (req, res, next) => {
    const post = await dbServices.findOne({
        model: postModel,
        filter: {
            _id: req.params.postId,
            userId: req.user._id,
            isDeleted: { $exists: false },
            isArchived: { $exists: false }
        },
    });

    if (!post) {
        return next(new Error("Post not found or you are not authorized", { cause: 404 }));
    }

    // Check if 24 hours have passed since creation
    const hoursElapsed = (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60);
    if (hoursElapsed < 24) {
        return next(new Error("You can only archive a post after 24 hours from its creation", { cause: 400 }));
    }

    // Update post with archive timestamp
    post.isArchived = Date.now();
    await post.save();

    return successResponse({ res, data: { post } });
});

export const updatePost = asyncHandler(async (req, res, next) => {
    let { specificUsers, privacy } = req.body;

    // Normalize specificUsers to always be an array
    if (privacy === privacyTypes.specific) {
        if (typeof specificUsers === "string") {
            specificUsers = [specificUsers];  // Convert single email to array
        }
    } else {
        specificUsers = [];  // Clear specificUsers if privacy isn't "specific"
    }

    // Retrieve the post to be updated
    const post = await dbServices.findOne({
        model: postModel,
        filter: {
            _id: req.params.postId,
            isDeleted: { $exists: false },
            userId: req.user._id
        }
    });

    if (!post) {
        return next(new Error("Invalid post ID or no permission to update", { cause: 404 }));
    }

    // Delete old attachments from Cloudinary if they exist
    if (post.attachments?.length) {
        for (const attachment of post.attachments) {
            await cloud.uploader.destroy(attachment.public_id); // Delete old files
        }
    }

    // Upload new attachments to Cloudinary
    let newAttachments = [];
    if (req.files?.length) {
        for (const file of req.files) {
            const { secure_url, public_id } = await cloud.uploader.upload(file.path, { folder: "post" });
            newAttachments.push({ secure_url, public_id });
        }
    }

    // Convert emails to user IDs if privacy is "specific"
    let userSpecificIds = [];
    if (privacy === privacyTypes.specific && specificUsers.length) {
        const users = await dbServices.findAll({
            model: userModel,
            filter: { email: { $in: specificUsers } },
            select: '_id'
        });

        if (users.length !== specificUsers.length) {
            return next(new Error("Some emails do not exist."));
        }

        userSpecificIds = users.map(user => user._id);
    }

    // Update the post with new data
    const updatedPost = await dbServices.findOneAndUpdate({
        model: postModel,
        filter: { _id: req.params.postId },
        data: { ...req.body, specificUsers: userSpecificIds, attachments: newAttachments },
        options: { new: true }
    });

    return successResponse({ res, status: 200, data: { updatedPost } });
});


export const freezePost = asyncHandler(async (req, res, next) => {
    const owner = req.user.role === roleTypes.admin ? {} : { userId: req.user._id }

    const post = await dbServices.findOneAndUpdate({
        model: postModel,
        filter: {
            _id: req.params.postId,
            isDeleted: { $exists: false },
            ...owner
        },
        data: {
            isDeleted: Date.now(),
            deletedBy: req.user._id
        },
        options: {
            new: true
        }
    })
    return post ? successResponse({ res, status: 200, data: { post } }) : next(new Error("Invalid post ID or no permission", { cause: 404 }))
})

export const restorePost = asyncHandler(async (req, res, next) => {
    const post = await dbServices.findOneAndUpdate({
        model: postModel,
        filter: {
            _id: req.params.postId,
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
    return post ? successResponse({ res, status: 200, data: { post } }) : next(new Error("Invalid post ID or no permission", { cause: 404 }))
})

export const likePost = asyncHandler(async (req, res, next) => {
    const { action } = req.query;
    const data = action?.toLowerCase() === "unlike" ? { $pull: { likes: req.user._id } } : { $addToSet: { likes: req.user._id } };
    const post = await dbServices.findOneAndUpdate({
        model: postModel,
        filter: {
            _id: req.params.postId,
            isDeleted: { $exists: false },
        },
        data,
        options: {
            new: true
        }
    })

    getIo().to(socketConnections.get(post.userId.toString())).emit("likePost", { postId: req.params.postId, likedBy: req.user._id , action})
    return post ? successResponse({ res, status: 200, data: { post } }) : next(new Error("Invalid post ID", { cause: 404 }))
})




