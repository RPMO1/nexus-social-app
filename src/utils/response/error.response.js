export const asyncHandler = (fn) => {
    return (req, res, next) => {
        return fn(req, res, next).catch(error => {
            return next(Error(error.message || "Internal Server Error", { cause: 500 }));
        })
    }
}

export const globalErrorHandling = (error, req, res, next) => {
    if (process.env.MOOD == "DEV") {
        return res.status(error.cause || 400).json({ message: error.message, error, stack: error.stack });
    }
    return res.status(error.cause || 400).json({ message: error.message, error });
}