import { Router } from "express";
import {
  changeCurrentPassword,
  getCurrentUser,
  getUserChannelProfile,
  getWatchHistory,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router();

router.route("/register").post(
  upload.fields([
    { name: "avatar", maxCount: 1 },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
); //tested successfully
router.route("/login").post(loginUser); //tested successfully

//secured routes
router.route("/logout").post(verifyJWT, logoutUser); //tested successfully
router.route("/refresh-token").post(refreshAccessToken);

router.route("/change-password").post(verifyJWT, changeCurrentPassword); //tested successfully
router.route("/current-user").get(verifyJWT, getCurrentUser); //tested successfully
router.route("/update-account").patch(verifyJWT, updateAccountDetails); //tested successfully
router
  .route("/avatar")
  .patch(verifyJWT, upload.single("avatarLocalPath"), updateUserAvatar); //tested successfully
router
  .route("/cover-image")
  .patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage); //tested successfully
router.route("/c/:username").get(verifyJWT, getUserChannelProfile);
router.route("/history").get(verifyJWT, getWatchHistory);

export default router;
