import multer from 'multer'


export const uploadCloudFile = (fileValidation = []) => {

    const storage = multer.diskStorage({})

    function fileFilter(req, file, cb) {
        console.log(file.mimetype);
        if (fileValidation.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb("In-valid file format", false);
        }
    }
    return multer({ dest: "dest", fileFilter, storage })
}

