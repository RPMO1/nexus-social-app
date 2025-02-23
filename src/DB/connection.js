import mongoose from "mongoose";
import chalk from "chalk"


const connectDB = async () => {
    return await mongoose.connect(process.env.DB_URI).then(res => {
        console.log(chalk.bgBlue("Database Connected"))
    }).catch(err => {
        console.log(chalk.bgRed("Database Connection Failed"), err)
    })
};

export default connectDB;