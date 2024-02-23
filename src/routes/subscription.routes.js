import { Router } from "express";
import {
  getSubscribedChannels,
  getUserChannelSubscribers,
  toggleSubscription,
} from "../controllers/subscription.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/c/:channelId").post(toggleSubscription); //tested Successfully
router.route("/c/:subscriberId").get(getSubscribedChannels); //tested Successfully

router.route("/u/:channelId").get(getUserChannelSubscribers); //tested Successfully

export default router;
