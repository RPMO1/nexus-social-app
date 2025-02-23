import { Server } from "socket.io"
import { logoutSocket, registerSocket } from "./service/chat.auth.service.js"
import { sendMessage } from "./service/message.service.js";

let io = undefined
export const runIo = async (httpServer) => {

    io = new Server(httpServer, {
        cors: "*"
    })


    return io.on("connection", async (socket) => {
        console.log(socket.handshake.auth)
        await registerSocket(socket)
        await sendMessage(socket)
        await logoutSocket(socket)
    });
}


export const getIo = () => {
    return io
}