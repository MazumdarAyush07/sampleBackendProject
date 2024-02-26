import { Router } from "express";
import {
  addComment,
  deleteComment,
  getVideoComments,
  updateComment,
} from "../controllers/comment.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router
  .route("/:videoId")
  .get(getVideoComments) //tested successfully
  .post(addComment); //tested successfully
router
  .route("/c/:commentId")
  .delete(deleteComment) //tested successfully
  .patch(updateComment); //tested successfully

export default router;
