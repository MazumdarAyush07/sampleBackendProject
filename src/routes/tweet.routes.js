import { Router } from "express";
import {
  createTweet,
  deleteTweet,
  getTweet,
  getUserTweets,
  updateTweet,
} from "../controllers/tweet.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/").post(createTweet); //tested successfully
router.route("/user/:userId").get(getUserTweets); //tested successfully
router
  .route("/:tweetId")
  .get(getTweet) //tested successfully
  .patch(updateTweet) //tested successfully
  .delete(deleteTweet);

export default router;
