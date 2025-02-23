import { GraphQLID, GraphQLInt, GraphQLList, GraphQLObjectType, GraphQLString } from "graphql"

export const postType = new GraphQLObjectType({
    name: "postType",
    fields: {
        _id: { type: GraphQLID },
        content: { type: GraphQLString },
        attachments: {
            type: new GraphQLList(new GraphQLObjectType({
                name: "attachmentsType",
                fields: {
                    secure_url: { type: GraphQLString },
                    public_id: { type: GraphQLString },
                }
            }))
        },
        likes: { type: new GraphQLList(GraphQLString) },
        tags: { type: new GraphQLList(GraphQLString) },
        share: { type: new GraphQLList(GraphQLString) },
        userId: { type: GraphQLString },
        deletedBy: { type: GraphQLID },
        isDeleted: { type: GraphQLString },
        privacy: { type: GraphQLString },
        specificUsers: { type: new GraphQLList(GraphQLID) },
        createdAt: { type: GraphQLString },
        updatedAt: { type: GraphQLString }
    }
})

export const postList = new GraphQLObjectType({
    name: "AllPosts",
    fields: {
        posts: {
            type: new GraphQLList(postType)
        }
    }
})

export const postListResponse = new GraphQLObjectType({
    name: "postListResponse",
    fields: {
        statusCode: { type: GraphQLInt },
        message: { type: GraphQLString },
        data: { type: postList }
    }
})

