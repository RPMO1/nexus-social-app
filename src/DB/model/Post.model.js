import mongoose, { Schema, Types, model } from "mongoose"

export const privacyTypes = { public: "public", onlyMe: "only-me", friends: "friends", specific: "specific" }

const postSchema = new Schema({
    content: {
        type: String,
        required: (data) => {
            return data?.images?.length ? false : true
        },
        minlength: 2,
        maxlength: 20000,
        trim: true
    },
    attachments: [{ secure_url: String, public_id: String }],
    likes: [{ type: Types.ObjectId, ref: 'User' }],
    tags: [{ type: Types.ObjectId, ref: 'User' }],
    share: [{ type: Types.ObjectId, ref: 'User' }],
    userId: { type: Types.ObjectId, ref: 'User', required: true },
    deletedBy: { type: Types.ObjectId, ref: 'User' },
    privacy: {
        type: String,
        enum: Object.values(privacyTypes),
        default: privacyTypes.public
    },
    specificUsers: [{
        type: Types.ObjectId,
        ref: 'User'
    }],
    isDeleted: Date,
    isArchived: Date,


}, { timestamps: true, toObject: { virtuals: true }, toJSON: { virtuals: true } });

postSchema.virtual('comments', {
    localField: '_id',
    foreignField: 'postId',
    ref: 'Comment',
})


// Soft delete a post and its comments
postSchema.pre("findOneAndUpdate", async function (next) {
    const update = this.getUpdate();

    // If the post is being soft deleted
    if (update.isDeleted !== undefined) {
        const updateComments = update.isDeleted
            ? { $set: { isDeleted: Date.now() } } // Soft delete comments
            : { $unset: { isDeleted: 1 } }; // Restore comments

        await mongoose.model("Comment").updateMany(
            { postId: this.getQuery()._id, deletedBy: { $exists: false } },
            updateComments
        );
    }

    next();
});

//After the post is updated, ensure the post's comments are restored if the post is not deleted
postSchema.post("findOneAndUpdate", async function (doc) {
    if (!doc) return; // If no post is updated, exit

    // If the post is restored (not deleted), restore the comments
    if (!doc.isDeleted) {
        await mongoose.model("Comment").updateMany(
            { postId: doc._id, deletedBy: { $exists: false } },
            { $unset: { isDeleted: 1 } } 
        );
    }
});

export const postModel = mongoose.models.Post || model("Post", postSchema);
