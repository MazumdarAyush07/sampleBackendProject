import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.models.js";
import { Video } from "../models/video.models.js";
import { Comment } from "../models/comment.models.js";
import { Tweet } from "../models/tweet.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: toggle like on video
  if (!videoId || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid Video ID");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  const loggedInUser = req.user?._id;
  const videoIsLiked = await Like.findOneAndDelete({
    likedBy: loggedInUser,
    video: video,
  });
  if (videoIsLiked) {
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "You have unliked the video"));
  }
  if (!videoIsLiked) {
    const videoLike = await Like.create({
      likedBy: loggedInUser,
      video,
    });
    const createdLikedVideo = await Like.findById(videoLike._id);

    if (!createdLikedVideo) {
      throw new ApiError(500, "Server Error in liking the video");
    }

    return res
      .status(200)
      .json(
        new ApiResponse(201, createdLikedVideo, "Video Liked Successfully")
      );
  }
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  //TODO: toggle like on comment
  if (!commentId || !isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid Comment ID");
  }

  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "No such comment exists!");
  }

  const loggedInUser = req.user?._id;
  const commentIsLiked = await Like.findOneAndDelete({
    likedBy: loggedInUser,
    comment: comment,
  });

  if (commentIsLiked) {
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Unliked the comment"));
  }

  if (!commentIsLiked) {
    const commentLike = await Like.create({
      likedBy: loggedInUser,
      comment,
    });

    const createdLikedComment = await Like.findById(commentLike._id);
    if (!createdLikedComment) {
      throw new ApiError(500, "Server Error while liking this comment");
    }
    return res
      .status(200)
      .json(
        new ApiResponse(201, createdLikedComment, "Comment Liked Successfully")
      );
  }
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  //TODO: toggle like on tweet
  if (!tweetId || !isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid Tweet ID");
  }

  const tweet = await Tweet.findById(tweetId);
  if (!tweet) {
    throw new ApiError(404, "No such Tweet found!");
  }

  const loggedInUser = req.user?._id;
  const tweetIsLiked = await Like.findOneAndDelete({
    likedBy: loggedInUser,
    tweet: tweet,
  });

  if (tweetIsLiked) {
    return res.status(200).json(new ApiResponse(200, {}, "Unliked the Tweet"));
  }

  if (!tweetIsLiked) {
    const tweetLike = await Like.create({
      likedBy: loggedInUser,
      tweet,
    });

    const createLikedTweet = await Like.findById(tweetLike._id);
    if (!createLikedTweet) {
      throw new ApiError(500, "Something happened while creating the tweet");
    }
    return res
      .status(200)
      .json(new ApiResponse(200, createLikedTweet, "tweet liked Successfully"));
  }
});

const getLikedVideos = asyncHandler(async (req, res) => {
  //TODO: get all liked videos
  const userId = req.user?._id;

  const getLikedVideos = await Like.aggregate([
    {
      $match: {
        video: { $exists: true },
        likedBy: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "video",
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
                    fullName: 1,
                    username: 1,
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
    {
      $addFields: {
        video: {
          $first: "$video",
        },
      },
    },
  ]);
  if (!getLikedVideos?.length) {
    throw new ApiError(404, "No liked videos found");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(200, getLikedVideos, "Liked Videos fetched Successfully")
    );
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
