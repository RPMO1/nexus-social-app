import mongoose, { Schema, Types, model } from "mongoose"

const commentSchema = new Schema({
    content: {
        type: String,
        required: (data) => {
            return data?.attachments?.length ? false : true
        },
        minlength: 2,
        maxlength: 20000,
        trim: true
    },
    attachments: [{ secure_url: String, public_id: String }],
    likes: [{ type: Types.ObjectId, ref: 'User' }],
    tags: [{ type: Types.ObjectId, ref: 'User' }],
    userId: { type: Types.ObjectId, ref: 'User', required: true },
    postId: { type: Types.ObjectId, ref: 'Post', required: true },
    commentId: { type: Types.ObjectId, ref: 'Comment' },
    deletedBy: { type: Types.ObjectId, ref: 'User' },
    isDeleted: Date,


}, { timestamps: true, toObject: { virtuals: true }, toJSON: { virtuals: true } });

commentSchema.virtual("reply", {
    localField: "_id",
    foreignField: "commentId",
    ref: "Comment",
    justOne: true
})

export const commentModel = mongoose.models.Comment || model("Comment", commentSchema);
