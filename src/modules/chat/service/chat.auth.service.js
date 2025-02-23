import { socketConnections } from "../../../DB/model/User.model.js"
import { authenticationSocket } from "../../../middleware/auth.socket.middlware.js"

export const registerSocket = async (socket) => {
    const { data } = await authenticationSocket({ socket })
    if (!data.valid) {
        return socket.emit("socketErrorResponse", data)
    }
    socketConnections.set(data.user._id.toString(), socket.id)
    console.log(socketConnections)
    return "Done"
}

export const logoutSocket = async (socket) => {
    socket.on("disconnect", async () => {
        console.log("disconnected")
        const { data } = await authenticationSocket({ socket })
        if (!data.valid) {
            return socket.emit("socketErrorResponse", data)
        }
        socketConnections.delete(data.user._id.toString(), socket.id)
        console.log(socketConnections)
        return "Done"
    })

}