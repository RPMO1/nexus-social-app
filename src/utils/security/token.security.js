import jwt from "jsonwebtoken"
import { userModel } from "../../DB/model/User.model.js";
import * as dbServices from "../../DB/db.service.js"

export const tokenTypes = { access: "access", refresh: "refresh" }

export const decodeToken = async ({ authorization = "", tokenType = tokenTypes.access, next } = {}) => {
    const [bearer, token] = authorization?.split(" ") || []
    if (!bearer || !token) {
        return next(new Error("Authorization is required or In-valid format", { cause: 400 }));
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
        return next(new Error("In-valid token payload", { cause: 401 }))
    }

    const user = await dbServices.findOne({ model: userModel, filter: { _id: decoded.id, isDeleted: { $exists: false } } });
    if (!user) {
        return next(new Error("In-valid account", { cause: 404 }))
    }

    if (user.credentialsChangeTime?.getTime() >= (decoded.iat * 1000)) {
        return next(new Error("Expired Credentials, please login again", { cause: 403 }));
    }

    return user
}

export const generateToken = ({ payload = {}, signature = process.env.USER_ACCESS_TOKEN, expiresIn = parseInt(process.env.expiresIn) } = {}) => {
    const token = jwt.sign(payload, signature, { expiresIn });
    return token;
}

export const verifyToken = ({ token = "", signature = process.env.USER_ACCESS_TOKEN } = {}) => {
    const decoded = jwt.verify(token, signature);
    return decoded;
}