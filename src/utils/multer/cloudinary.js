import path from "node:path"
import * as dotenv from 'dotenv'
dotenv.config({ path: path.resolve('./src/config/.env.dev') })
import * as cloudinary from 'cloudinary';


cloudinary.v2.config({
    cloud_name: process.env.cloud_name,
    secure: true,
    api_key: process.env.api_key,
    api_secret: process.env.api_secret // Click 'View API Keys' above to copy your API secret
});


export default cloudinary.v2