import { roleTypes } from "../../DB/model/User.model.js"
export const endpoint = {
    createPost: [roleTypes.user],
    undoPost: [roleTypes.user],
    archivePost: [roleTypes.user],
    updatePost: [roleTypes.user],

    freezePost: [roleTypes.user, roleTypes.admin, roleTypes.superAdmin],
    likePost: [roleTypes.user, roleTypes.admin, roleTypes.superAdmin],

    getAllPosts: [roleTypes.admin, roleTypes.superAdmin],

    getOwnPosts: [roleTypes.user],
    getUserPublicPosts: [roleTypes.user],
    getFriendsPublicPosts: [roleTypes.user],
    getSpecificUserPosts: [roleTypes.user],
}