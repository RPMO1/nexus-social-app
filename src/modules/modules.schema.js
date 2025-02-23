import { GraphQLObjectType, GraphQLSchema } from "graphql";
import * as postResolver from "./post/services/post.solver.js"

export const schema = new GraphQLSchema({
    query: new GraphQLObjectType({
        name: "mainSchemaQuery",
        fields: {
            ...postResolver
        }
    })
})