import joi from "joi"
import { generalFields } from "../../middleware/validation.middlware.js"
import { privacyTypes } from "../../DB/model/Post.model.js"

export const createPost = joi.object().keys({
    content: joi.string().min(2).max(20000).trim(),
    file: joi.array().items(generalFields.file).max(2)

}).or("content", "file")

// export const updatePost = joi.object().keys({
//     postId: generalFields.id,
//     content: joi.string().min(2).max(20000).trim(),
//     file: joi.array().items(generalFields.file).max(2),
//     privacy: joi.string().valid(privacyTypes.public, privacyTypes.onlyMe, privacyTypes.friends, privacyTypes.specific).optional(),
//     specificUsers: joi.array().items(joi.string().email()).when('privacy', { is: privacyTypes.specific, then: joi.required() }),
// }).or("content", "file");

export const updatePost = joi.object().keys({
    postId: generalFields.id,
    content: joi.string().min(2).max(20000).trim(),
    file: joi.array().items(generalFields.file).max(2),
    privacy: joi.string()
        .valid(privacyTypes.public, privacyTypes.onlyMe, privacyTypes.friends, privacyTypes.specific)
        .optional(),
    specificUsers: joi.alternatives().try(
        joi.string().email(),  // Single email as a string
        joi.array().items(joi.string().email())  // Multiple emails as an array
    ).when('privacy', { is: privacyTypes.specific, then: joi.required() }),
}).or("content", "file");


export const freezePost = joi.object().keys({
    postId: generalFields.id.required()
}).required()

export const undoPost = freezePost
export const archivePost = freezePost

export const likePost = joi.object().keys({
    postId: generalFields.id.required(),
    action: joi.string().default('like'),
}).required()