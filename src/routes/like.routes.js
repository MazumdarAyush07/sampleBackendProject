import { Router } from "express";
import {
  getLikedVideos,
  toggleCommentLike,
  toggleVideoLike,
  toggleTweetLike,
} from "../controllers/like.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/toggle/v/:videoId").post(toggleVideoLike); //tested successfully
router.route("/toggle/c/:commentId").post(toggleCommentLike); //tested successfully
router.route("/toggle/t/:tweetId").post(toggleTweetLike); //tested successfully
router.route("/videos").get(getLikedVideos); //tested successfully

export default router;
