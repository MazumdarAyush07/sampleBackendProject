import mongoose, { Types, isValidObjectId } from "mongoose";
import { Video } from "../models/video.models.js";
import { Comment } from "../models/comment.models.js";
import { Like } from "../models/like.models.js";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const publishAVideo = asyncHandler(async (req, res) => {
  // TODO: get video, upload to cloudinary, create video
  /* The following things are required
    video
    thumbnail
    title
    description
    duration
    owner
  */
  const { title, description } = req.body;
  if (!title || !description) {
    throw new ApiError(400, "Title and Description are required");
  }

  const videoLocalPath = req.files?.videoFile[0].path;
  if (!videoLocalPath) {
    throw new ApiError(422, "No video file uploaded!");
  }

  const thumbnailLocalPath = req.files?.thumbnail[0].path;
  if (!thumbnailLocalPath) {
    throw new ApiError(422, "Thumbnail not provided");
  }

  const video = await uploadOnCloudinary(videoLocalPath);
  const thumbnailFile = await uploadOnCloudinary(thumbnailLocalPath);

  if (!video || !thumbnailFile) {
    throw new ApiError(500, "Failed to save the files on Cloudinary");
  }
  const videos = await Video.create({
    videoFile: video.url,
    thumbnail: thumbnailFile.url,
    title,
    description,
    duration: video.duration,
    views: 5,
    isPublished: true,
    owner: req.user._id,
  });

  if (!videos) {
    throw new ApiError(500, "Something went wrong when creating a video");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, videos, "Video uploaded successfully"));
});

const getAllVideos = asyncHandler(async (req, res) => {
  const { page, limit, query, sortBy, sortType, userId } = req.query;
  //TODO: get all videos based on query, sort, pagination

  const sortTypeNum = Number(sortType);
  const pageNum = Number(page);
  const limitNum = Number(limit);

  if (
    !(sortTypeNum && pageNum && limitNum && query && sortBy && pageNum != 0)
  ) {
    throw new ApiError(400, "Invalid parameters in request");
  }

  if (!userId || !Types.ObjectId.isValid(userId)) {
    throw new ApiError(401, "Please provide proper user ID");
  }

  const getVideos = await Video.aggregate([
    {
      $match: {
        owner: userId ? new mongoose.Types.ObjectId(userId) : { $exists: true },
        isPublished: true,
        $text: {
          $search: query,
        },
      },
    },
    {
      $addFields: {
        sortField: "$" + sortBy,
      },
    },
    {
      $sort: { sortField: sortTypeNum },
    },
    {
      $skip: (pageNum - 1) * limitNum,
    },
    {
      $facet: {
        videos: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "onwer",
              pipeline: [
                {
                  $project: {
                    username: 1,
                    fullName: 1,
                    avatar: 1,
                    createdAt: 1,
                    updatedAt: 1,
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
        matchedVideosCount: [{ $count: "videos" }],
      },
    },
  ]);
  if (!getVideos[0]?.matchedVideos?.length) {
    throw new ApiError(404, "No video found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, getVideos[0], "All videos fetched successfully")
    );
});

const getVideoById = asyncHandler(async (req, res) => {
  //TODO: get video by id
  const { videoId } = req.params;
  if (!videoId || !Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid ID");
  }

  await Video.findByIdAndUpdate(videoId, { $inc: { views: 1 } });

  const video = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId),
        isPublished: true,
      },
    },
    {
      $facet: {
        getAVideo: [
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
                    createdAt: 1,
                    updatedAt: 1,
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
        totalLikesCommentsAndSubscription: [
          {
            $lookup: {
              from: "likes",
              localField: "_id",
              foreignField: "video",
              as: "totalLikesOnVideo",
            },
          },
          {
            $addFields: {
              likedByUser: {
                $in: [req.user?._id, "$totalLikesOnVideo.likedBy"],
              },
            },
          },
          {
            $lookup: {
              from: "comments",
              localField: "_id",
              foreignField: "video",
              as: "totalComments",
            },
          },
          {
            $lookup: {
              from: "subscriptions",
              localField: "owner",
              foreignField: "channel",
              as: "subscribers",
            },
          },
          {
            $addFields: {
              isSubscribedTo: {
                $in: [req.user?._id, "$subscribers.subscriber"],
              },
            },
          },
          {
            $group: {
              _id: null,
              TotalLikesOnVideo: { $sum: { $size: "$totalLikesOnVideo" } },
              TotalComments: { $sum: { $size: "$totalComments" } },
              TotalSubscribers: { $sum: { $size: "$subscribers" } },
              isSubscribedTo: { $first: "$isSubscribedTo" },
              likedByUser: { $first: "$likedByUser" },
            },
          },
        ],
      },
    },
  ]);
  if (!video[0].getAVideo.length) {
    throw new ApiError(404, "Video does not exist");
  }

  const user = await User.findById(req.user?._id);
  const matchedVideo = user.watchHistory.find((video) => video.equals(videoId));

  if (!matchedVideo) {
    user.watchHistory.push(videoId);
    await user.save();
  }
  return res
    .status(200)
    .json(new ApiResponse(200, video[0], "Video fetched successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  //TODO: update video details like title, description, thumbnail
  const { videoId } = req.params;

  if (!videoId || !Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid ID");
  }
  const video = await Video.findById(videoId);

  if (req.user._id.toString() !== video.owner.toString()) {
    throw new ApiError(403, "You are not authorized to perform this action");
  }

  const { title, description } = req.body;
  const thumbnailLocalPath = req.file?.path;

  let updatedTitle, updatedDescription, updatedThumbnail;
  if (title) {
    updatedTitle = title;
  } else {
    updatedTitle = video.title;
  }
  if (description) {
    updatedDescription = description;
  } else {
    updatedDescription = video.description;
  }
  if (thumbnailLocalPath) {
    updatedThumbnail = await uploadOnCloudinary(thumbnailLocalPath);
  } else {
    updatedThumbnail = video.thumbnail;
  }

  const updatedVideoDetails = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        title: updatedTitle,
        description: updatedDescription,
        thumbnail: updatedThumbnail,
      },
    },
    { new: true }
  );
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedVideoDetails,
        "Successfully updated video details"
      )
    );
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!videoId || Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid ID");
  }

  const video = await Video.findById(videoId);
  if (req.user?._id.toString() != video?.owner.toString()) {
    throw new ApiError(401, "You are not authorized to perform this action");
  }

  const comments = await Comment.find({ video: video._id });
  for (const comment of comments) {
    await Like.deleteMany({ comment: comment._id });
  }

  await Comment.deleteMany({ video: video._id });
  await Like.deleteMany({ video: video._id });
  await Video.findByIdAndDelete(videoId);
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "The video has been deleted!"));
  //TODO: delete video
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!videoId || !Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid ID");
  }

  const video = await Video.findById(videoId);

  if (req.user?._id.toString() != video?.owner.toString()) {
    throw new ApiError(
      401,
      "Only the owner of a video can publish/unpublish it"
    );
  }

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        isPublished: !video.isPublished,
      },
    },
    { new: true }
  );
  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedVideo, "Publish status updated successfully")
    );
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
