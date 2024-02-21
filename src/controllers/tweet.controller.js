import mongoose, { Types, isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.models.js";
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

  const user = await User.findById(Types.ObjectId.createFromHexString(userId));

  if (!user) {
    throw new ApiError(404, "No such user found");
  }
  const tweets = await Tweet.aggregate([
    {
      $match: {
        owner: Types.ObjectId.createFromHexString(userId),
      },
    },
  ]);

  if (!tweets) {
    throw new ApiError(500, "There was a problem fetching the tweet");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, tweets, "All tweets fetched successfully"));
});

const getTweet = asyncHandler(async (req, res) => {
  //TODO: get a particular tweet
  const { tweetId } = req.params;
  if (!tweetId || !Types.ObjectId.isValid(tweetId)) {
    throw new ApiError(400, "Invalid Tweet Id");
  }

  const tweet = await Tweet.findById(tweetId);
  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }
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
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "The tweet was deleted successfully!"));
});

export { createTweet, getTweet, getUserTweets, updateTweet, deleteTweet };
