import { GraphQLID, GraphQLInt, GraphQLList, GraphQLNonNull, GraphQLObjectType, GraphQLString } from "graphql"
import * as dbServices from "../../../DB/db.service.js"
import { postModel, privacyTypes } from "../../../DB/model/Post.model.js"
import * as postTypes from "../types/post.types.js"
import { paginate } from "../../../utils/pagination.js"
import { authentication } from "../../../middleware/auth.graphql.middlware..js";
import { userModel } from "../../../DB/model/User.model.js"


export const getAllPosts = {
    type: postTypes.postListResponse,
    args: {
        authorization: { type: new GraphQLNonNull(GraphQLString) },
        page: { type: GraphQLInt },
        size: { type: GraphQLInt },

    },
    resolve: async (parent, args) => {
        const { authorization, page, size } = args;
        const user = await authentication({ authorization })
        console.log({user})
        if (user.role !== "admin" && user.role !== "superAdmin") {
            throw new Error("Unauthorized Account")
        }

        const data = await paginate({
            model: postModel,
            filter: { isDeleted: { $exists: false }, isArchived: { $exists: false } }, 
            page,
            size,
        });
        return { statusCode: 200, message: "Done", data: { posts: data.result } };
    }
};

export const getUserPublicPosts = {
    type: postTypes.postListResponse,
    args: {
        authorization: { type: new GraphQLNonNull(GraphQLString) },
        userId: { type: GraphQLID },
        page: { type: GraphQLInt },
        size: { type: GraphQLInt },
    },
    resolve: async (parent, args) => {
        const { authorization, userId, page, size } = args;

        const user = await authentication({ authorization })

        // Fetch the post owner's blocked users list
        const postsOwner = await dbServices.findById({
            model: userModel,
            id: userId,
            select: "blockedUsers"
        });

        // Check if the requesting user or post owner has blocked each other
        if (user.blockedUsers.includes(userId) || postsOwner.blockedUsers.includes(user._id)) {
            throw new Error("Access denied. You have been blocked or have blocked this user.");
        }

        // Fetch public posts without population
        const data = await paginate({
            model: postModel,
            filter: {
                userId,
                privacy: privacyTypes.public,
                isDeleted: { $exists: false },
                isArchived: { $exists: false },
            },
            page,
            size,
        });

        return { statusCode: 200, message: "Done", data: { posts: data.result } };
    }
};


export const getFriendsPublicPosts = {
    type: postTypes.postListResponse,
    args: {
        authorization: { type: new GraphQLNonNull(GraphQLString) },
        page: { type: GraphQLInt },
        size: { type: GraphQLInt },
    },
    resolve: async (parent, args) => {
        const { authorization, page, size } = args;

        const user = await authentication({ authorization });

        // Fetch the user's friends list
        const userData = await dbServices.findById({
            model: userModel,
            id: user._id,
            select: "friends"
        });

        if (!userData) {
            throw new Error("User not found");
        }

        // Fetch only friends-only posts from friends
        const data = await paginate({
            model: postModel,
            filter: {
                privacy: privacyTypes.friends,
                userId: { $in: userData.friends },
                isDeleted: { $exists: false },
                isArchived: { $exists: false },
            },
            page,
            size,
        });

        return { statusCode: 200, message: "Done", data: { posts: data.result } };
    }
};


export const getSpecificUserPosts = {
    type: postTypes.postListResponse,
    args: {
        authorization: { type: new GraphQLNonNull(GraphQLString) },
        page: { type: GraphQLInt },
        size: { type: GraphQLInt },
    },
    resolve: async (parent, args) => {
        const { authorization, page, size } = args;

        // Authenticate user
        const user = await authentication({ authorization });

        if (!user) {
            throw new Error("User not found");
        }

        // Fetch posts with privacy = "specific" where the user is in `specificUsers`
        const data = await paginate({
            model: postModel,
            filter: {
                privacy: privacyTypes.specific,
                specificUsers: user._id,
                isDeleted: { $exists: false },
                isArchived: { $exists: false },
            },
            page,
            size,
        });

        return { statusCode: 200, message: "Done", data: { posts: data.result } };
    }
};

