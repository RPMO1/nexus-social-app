import { Router } from "express"
import { authentication } from "../../middleware/auth.middlware.js"
import  * as chatServices from "./service/chat.service.js"
const router = Router()



router.get('/:destId', authentication(), chatServices.findOneChat)

export default router