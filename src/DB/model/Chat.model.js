import mongoose, { model, Schema } from "mongoose";

export const chatSchema = new Schema({
    mainUser: { type: mongoose.Types.ObjectId, ref: 'User', required: true },
    subParticipant: { type: mongoose.Types.ObjectId, ref: 'User', required: true },
    messages: [
        {
            message: { type: String, required: true },
            senderId: { type: mongoose.Types.ObjectId, ref: 'User', required: true },
        }
    ]
}, {
    timestamps: true
})

export const chatModel = mongoose.models.Chat || model("Chat", chatSchema)