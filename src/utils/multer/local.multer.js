import multer from 'multer'
import path from 'node:path'
import fs from "fs"

export const fileValidationTypes = {
    image: ['image/jpg', 'image/jpeg', 'image/png', 'image/gif'],
    document: ['application/json', 'application/pdf']
}
export const uploadDiskFile = (customPath = 'general', fileValidation = []) => {

    const basePath = `uploads/${customPath}`;
    const fullPath = path.resolve(`./src/${basePath}`);

    console.log({ basePath, fullPath })

    // Check if directory exists, otherwise create it
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
    }

    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, fullPath)
        },
        filename: (req, file, cb) => {
            console.log({ file })
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
            file.finalPath = basePath + "/" + uniqueSuffix + "_" + file.originalname
            cb(null, uniqueSuffix + "_" + file.originalname)
        }
    })

    function fileFilter(req, file, cb) {
        console.log(file.mimetype);
        if (fileValidation.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb("In-valid file format", false);
        }
    }
    return multer({ dest: "defaultUpload", fileFilter, storage })
}

