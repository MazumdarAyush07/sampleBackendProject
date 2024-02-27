import { Router } from "express";
import {
  addVideoToPlaylist,
  createPlaylist,
  deletePlaylist,
  getPlaylistById,
  getUserPlaylists,
  removeVideoFromPlaylist,
  updatePlaylist,
} from "../controllers/playlist.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/").post(createPlaylist); //tested successfully

router
  .route("/:playlistId")
  .get(getPlaylistById) //tested successfully
  .patch(updatePlaylist) //tested successfully
  .delete(deletePlaylist); //tested successfully

router.route("/add/:videoId/:playlistId").patch(addVideoToPlaylist); //tested successfully
router.route("/remove/:videoId/:playlistId").patch(removeVideoFromPlaylist); //tested successfully

router.route("/user/:userId").get(getUserPlaylists); //tested successfully

export default router;
