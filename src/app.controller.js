import path from "node:path"
import connectDB from './DB/connection.js'
import authController from './modules/auth/auth.controller.js'
import userController from './modules/user/user.controller.js'
import postController from './modules/post/post.controller.js'
import commentController from './modules/comment/comment.controller.js'
import chatController from "./modules/chat/chat.controller.js"
import { globalErrorHandling } from './utils/response/error.response.js'
import { createHandler } from "graphql-http/lib/use/express"
import { schema } from "./modules/modules.schema.js"
import cors from 'cors'
import rateLimit from "express-rate-limit"
import helmet from "helmet"
import morgan from "morgan"


const limiter = rateLimit({
    limit: 20,
    windowMs: 2 * 60 * 1000, // 2 minutes
    message: { err: "rate limit reached" },
    statusCode: 400,
    handler: (req, res, next) => {
        return next(new Error("too many requests, wait for 2 minutes", { cause: 429 }))
    },
    // legacyHeaders: false   //default: true
    standardHeaders: 'draft-8'
})
const bootstrap = (app, express) => {
    var whitelist = process.env.ORIGIN.split(",") || []

    app.use(cors())
    app.use(morgan('tiny'))
    app.use(helmet())
    app.use(express.json())
    app.use('/auth', limiter)


    app.use('/uploads', express.static(path.resolve('./src/uploads')))

    app.get("/", (req, res, next) => {
        return res.status(200).json({ message: "Welcome in node.js project powered by express and ES6" })
    })

    app.use("/graphql", createHandler({ schema }))
    app.use("/auth", authController)
    app.use("/user", userController)
    app.use("/post", postController)
    app.use("/comment", commentController)
    app.use("/chat", chatController)

    app.all("*", (req, res, next) => {
        return res.status(404).json({ message: "In-valid routing" })
    })

    app.use(globalErrorHandling)

    connectDB()

}

export default bootstrap