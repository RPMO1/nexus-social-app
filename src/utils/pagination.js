import * as dbServices from "../DB/db.service.js"
import { postModel } from "../DB/model/Post.model.js"

export const paginate = async ({
    page = process.env.PAGE,
    size = process.env.SIZE,
    model,
    filter = {},
    populate = [],
    select = '',
} = {}) => {
    page = parseInt(parseInt(page) < 1 ? 1 : page)
    size = parseInt(parseInt(size) < 1 ? 1 : size)
    const skip = (page - 1) * size

    const count = await postModel.find(filter).countDocuments()

    const result = await dbServices.findAll({
        model,
        populate,
        select,
        filter,
        skip,
        limit: size
    });
    return ({ result, page, size, count })
}