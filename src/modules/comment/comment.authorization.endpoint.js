import { roleTypes } from "../../DB/model/User.model.js"
export const endpoint = {
    create: [roleTypes.user],
    update: [roleTypes.user],

    freeze: [roleTypes.user, roleTypes.admin,],
    like: [roleTypes.user, roleTypes.admin],

    // getAllPosts: [roleTypes.admin],    // + superadmin

}