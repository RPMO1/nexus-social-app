import mongoose, { model, Schema, Types } from "mongoose";

const friendRequestSchema = new Schema({
    friendId: { type: Types.ObjectId, ref: "User", required: true },
    senderId: { type: Types.ObjectId, ref: "User", required: true },
    status: { type: Boolean, default: false },
}, { timestamps: true })

export const friendRequestModel = mongoose.models.FriendRequest || model("FriendRequest", friendRequestSchema)