import { authenticationSocket } from "../../../middleware/auth.socket.middlware.js"
import * as dbServices from "../../../DB/db.service.js"
import { chatModel } from "../../../DB/model/Chat.model.js"
import { socketConnections } from "../../../DB/model/User.model.js"

export const sendMessage = (socket) => {

    return socket.on("sendMessage", async (messageData) => {
        const { data } = await authenticationSocket({ socket })
        console.log({ data })
        if (!data.valid) {
            return socket.emit("socketErrorResponse", data)
        }
        const userId = data.user._id.toString()
        const { destId, message } = messageData
        console.log({ userId, destId, message })

        const chat = await dbServices.findOneAndUpdate({
            model: chatModel,
            filter: {
                $or: [
                    {
                        mainUser: userId,
                        subParticipant: destId
                    },
                    {
                        mainUser: destId,
                        subParticipant: userId
                    }
                ]
            },
            data: { $push: { messages: { message, senderId: userId } } }
        })
        if (!chat) {
            await dbServices.create({
                model: chatModel,
                data: {
                    mainUser: userId,
                    subParticipant: destId,
                    messages: [{ message, senderId: userId }]
                }
            })
        }
        socket.emit('successMessage', { message })
        console.log("Recipient socket ID:", socketConnections.get(destId));
        socket.to(socketConnections.get(destId)).emit("recieveMessage", { message, senderId: userId })
        return "Done";
    })
};