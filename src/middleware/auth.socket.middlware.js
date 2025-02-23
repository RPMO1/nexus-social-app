import { tokenTypes, verifyToken } from "../utils/security/token.security.js";
import * as dbServices from "../DB/db.service.js"
import { socketConnections, userModel } from "../DB/model/User.model.js";



export const authenticationSocket = async ({ socket = {}, tokenType = tokenTypes.access } = {}) => {

    const [bearer, token] = socket.handshake?.auth?.authorization?.split(" ") || [];

    if (!bearer || !token) {
        return { data: { message: "Authorization is required or In-valid format", status: 401 } }
    }

    let accessSignature = "";
    let refreshSignature = "";
    switch (bearer) {
        case "System":
            accessSignature = process.env.SYSTEM_ACCESS_TOKEN;
            refreshSignature = process.env.SYSTEM_REFRESH_TOKEN;
            break;
        case "Bearer":
            accessSignature = process.env.USER_ACCESS_TOKEN;
            refreshSignature = process.env.USER_REFRESH_TOKEN;
            break;
        default:
            break;

    }

    const decoded = verifyToken({ token, signature: tokenType == tokenTypes.access ? accessSignature : refreshSignature });
    if (!decoded?.id) {
        return { data: { message: "In-valid token payload", status: 401 } }
    }

    const user = await dbServices.findOne({ model: userModel, filter: { _id: decoded.id } });
    if (!user) {
        return { data: { message: "In-valid account", status: 401 } }

    }

    if (user.credentialsChangeTime?.getTime() >= (decoded.iat * 1000)) {
        return { data: { message: "Expired Credentials, please login again", status: 401 } }
    }

    socketConnections.set(user._id.toString(), socket.id)
    return { data: { user, valid: true } }
}


// export const authorization = (accessRoles = []) => {
//     return asyncHandler(
//         async (req, res, next) => {
//             if (!accessRoles.includes(req.user.role)) {
//                 return next(new Error("Not authorized account", { cause: 403 }))
//             }
//             return next()
//         }
//     )
// } 