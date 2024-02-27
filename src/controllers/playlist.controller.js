import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.models.js";
import { Video } from "../models/video.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.models.js";

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  if (
    !name ||
    name.trim() === "" ||
    !description ||
    description.trim() === ""
  ) {
    throw new ApiError(400, "All fields are required");
  }
  const user = req.user?._id;
  const playlist = await Playlist.create({
    name,
    description,
    owner: user,
  });

  const createdPlaylist = await Playlist.findById(playlist._id);

  if (!createdPlaylist) {
    throw new ApiError(500, "Something went wrong while creating the playlist");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(200, createdPlaylist, "Playlist created successfully")
    );
  //TODO: create playlist
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  //TODO: get user playlists
  if (!userId || !isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid User ID provided");
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const userPlaylist = await Playlist.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(user),
      },
    },
  ]);
  if (!userPlaylist?.length) {
    throw new ApiError(404, "This user does not have any playlists");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        userPlaylist,
        "Playlist of the user fetched successfully"
      )
    );
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  //TODO: get playlist by id
  if (!playlistId || !isValidObjectId(playlistId)) {
    throw new ApiError(404, "Playlist does not exist");
  }

  const playlist = await Playlist.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(playlistId),
      },
    },
    {
      $lookup: {
        from: "user",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              username: 1,
              fullName: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        owner: {
          $first: "$owner",
        },
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    username: 1,
                    fullName: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);
  if (!playlist?.length) {
    throw new ApiError(404, "This playlist does not exist");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, playlist[0], "Playlist fetched successfully"));
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  if (!playlistId || !isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist ID");
  }
  if (!videoId || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid Video Id");
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(404, "Playlist Not Found");
  }

  if (playlist.owner.toString() != req.user?._id.toString()) {
    throw new ApiError(400, "You are not the owner of this playlist");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  const matchedVideo = playlist.videos.find((video) => video.equals(videoId));
  if (matchedVideo) {
    throw new ApiError(409, "Video already exists in the playlist");
  }

  const addVideo = playlist.videos.push(video);
  if (!addVideo) {
    throw new ApiError(500, "Unable to add the video to the playlist");
  }
  const updatedPlaylist = await playlist.save();

  return res
    .status(201)
    .json(new ApiResponse(200, updatedPlaylist, "Video added to the playlist"));
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  if (!playlistId || !isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist ID");
  }
  if (!videoId || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid Video Id");
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(404, "Playlist Not Found");
  }

  if (playlist.owner.toString() != req.user?._id.toString()) {
    throw new ApiError(400, "You are not the owner of this playlist");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  const matchedVideo = playlist.videos.find((video) => video.equals(videoId));
  if (!matchedVideo) {
    throw new ApiError(409, "Video does not exist in the playlist");
  }

  const deleteVideo = playlist.videos.pull(videoId);
  if (!deleteVideo) {
    throw new ApiError(500, "Internal server error while deleting");
  }

  const updatedPlaylist = await playlist.save();

  return res
    .status(201)
    .json(
      new ApiResponse(200, updatedPlaylist, "Video deleted from the playlist")
    );
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  // TODO: delete playlist
  if (!playlistId || !isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid Playlist ID");
  }

  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new ApiError(404, "Playlist Not Found");
  }

  if (playlist.owner.toString() != req.user?._id.toString()) {
    throw new ApiError(400, "You are not the owner of the playlist");
  }

  const deletedPlaylist = await Playlist.findByIdAndDelete(playlistId);

  if (!deletedPlaylist) {
    throw new ApiError(500, "Unanle to delete playlist");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, "Playlist deleted successfully"));
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;

  if (!playlistId || !isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid Playlist ID");
  }
  if (
    !name ||
    name.trim() === "" ||
    !description ||
    description.trim() === ""
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  if (playlist.owner.toString() != req.user?._id.toString()) {
    throw new ApiError(400, "You are not the owner of this playlist");
  }

  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $set: {
        name,
        description,
      },
    },
    { new: true }
  );
  if (!updatedPlaylist) {
    throw new ApiError(500, "Unable to update playlist");
  }
  return res
    .status(201)
    .json(
      new ApiResponse(200, updatedPlaylist, "Playlist updated successfully")
    );
  //TODO: update playlist
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
