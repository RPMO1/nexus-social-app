import { tokenTypes, verifyToken } from "../utils/security/token.security.js";
import * as dbServices from "../DB/db.service.js"
import { userModel } from "../DB/model/User.model.js";


export const authentication = async ({ authorization = "", tokenType = tokenTypes.access } = {}) => {
    const [bearer, token] = authorization?.split(" ") || []
    if (!bearer || !token) {
        throw new Error("Authorization is required or In-valid format")
    }

    let accessSignature = "";
    let refreshSignature = "";
    switch (bearer) {
        case 'system':
            accessSignature = process.env.SYSTEM_ACCESS_TOKEN;
            refreshSignature = process.env.SYSTEM_REFRESH_TOKEN;
            break;
        case 'Bearer':
            accessSignature = process.env.USER_ACCESS_TOKEN;
            refreshSignature = process.env.USER_REFRESH_TOKEN;
            break;
        default:
            break;
    }

    const decoded = verifyToken({ token, signature: tokenType == tokenTypes.access ? accessSignature : refreshSignature });
    if (!decoded?.id) {
        throw new Error("In-valid token payload")
    }

    const user = await dbServices.findOne({ model: userModel, filter: { _id: decoded.id } });
    if (!user) {
        throw new Error("In-valid account")
    }

    return user
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