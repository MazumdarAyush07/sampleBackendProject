import mongoose, { Types, isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.models.js";
import { Like } from "../models/like.models.js";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
  //TODO: create tweet
  /*
  Get the tweet details - content.
  validate the tweet.
  create the tweet in the database
  */
  const { content } = req.body;
  if (!content) {
    throw new ApiError(400, "Content field missing");
  }
  const tweet = await Tweet.create({
    owner: req.user._id,
    content,
  });

  if (!tweet) {
    throw new ApiError(500, "Something went wrong while posting");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, tweet, "Successfully created a tweet"));
});

const getUserTweets = asyncHandler(async (req, res) => {
  // TODO: get user tweets
  /*
  retrieve the user id
  check and validate
  create user.
  check for valid user
  use aggregate pipelines to find the user's tweets
  print send the retrieved tweets as a response
  */
  const { userId } = req.params;
  if (!userId || !Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "Invalid User ID");
  }

  const tweets = await Tweet.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "tweet",
        as: "tweetLikedBy",
      },
    },
    {
      $group: {
        _id: "$_id",
        content: { $first: "$content" },
        owner: { $first: "$owner" },
        createdAt: { $first: "$createdAt" },
        updatedAt: { $first: "$updatedAt" },
        totalTweetLikes: { $sum: { $size: "$tweetLikedBy" } },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  if (!tweets?.length) {
    throw new ApiError(404, "Tweet does not exist");
  }

  const tweetBy = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $addFields: {
        isTweetOwner: {
          $cond: {
            if: { $eq: [req.user?._id.toString(), userId] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        username: 1,
        fullName: 1,
        avatar: 1,
        createdAt: 1,
        updatedAt: 1,
        isTweetOwner: 1,
      },
    },
  ]);

  const tweetAndDetails = {
    tweets,
    tweetBy,
  };

  return res
    .status(200)
    .json(
      new ApiResponse(200, tweetAndDetails, "All tweets fetched successfully")
    );
});

const getTweet = asyncHandler(async (req, res) => {
  //TODO: get a particular tweet
  const { tweetId } = req.params;
  if (!tweetId || !Types.ObjectId.isValid(tweetId)) {
    throw new ApiError(400, "Invalid Tweet Id");
  }
  const tweet = await Tweet.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(tweetId),
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "tweet",
        as: "tweetLikedBy",
      },
    },
    {
      $group: {
        _id: "$_id",
        content: { $first: "$content" },
        owner: { $first: "$owner" },
        createdAt: { $first: "$createdAt" },
        updatedAt: { $first: "$updatedAt" },
        totalTweetLikes: { $sum: { $size: "$tweetLikedBy" } },
      },
    },
  ]);

  return res.status(200).json(new ApiResponse(200, tweet, "Tweet fetched"));
});

const updateTweet = asyncHandler(async (req, res) => {
  //TODO: update tweet
  /*
  Get the tweet id
  check the validity.
  Find the content.
  Update the content.
  return response
  */
  const { tweetId } = req.params;
  if (!tweetId || !Types.ObjectId.isValid(tweetId)) {
    throw new ApiError(400, "Invalid Tweet ID");
  }

  const tweet = await Tweet.findById(tweetId);

  if (req.user?._id.toString() != tweet?.owner.toString()) {
    throw new ApiError(401, "You are not authorized to perform this action");
  }

  const { content } = req.body;

  tweet = await Tweet.findByIdAndUpdate(
    tweetId,
    {
      $set: {
        content,
      },
    },
    { new: true }
  );

  if (!tweet) {
    throw new ApiError(404, "Tweet Not Found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, tweet, "Tweet has been updated successfully!"));
});

const deleteTweet = asyncHandler(async (req, res) => {
  //TODO: delete tweet
  /*
  Get the tweet id
  check the validity.
  Delete the tweet
  Delete the likes
  return response
  */
  const { tweetId } = req.params;
  if (!tweetId || !Types.ObjectId.isValid(tweetId)) {
    throw new ApiError(400, "Invalid Tweet Id");
  }

  const tweet = await Tweet.findById(tweetId);

  if (req.user?._id.toString() != tweet?.owner.toString()) {
    throw new ApiError(401, "You are not authorized to perform this action");
  }

  await Tweet.findByIdAndDelete(tweetId);
  await Like.deleteMany({ tweet: tweet._id });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "The tweet was deleted successfully!"));
});

export { createTweet, getTweet, getUserTweets, updateTweet, deleteTweet };
