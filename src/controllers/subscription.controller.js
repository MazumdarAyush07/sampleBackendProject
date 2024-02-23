import mongoose, { Types, isValidObjectId } from "mongoose";
import { User } from "../models/user.models.js";
import { Subscription } from "../models/subscription.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  // TODO: toggle subscription
  const { channelId } = req.params;

  if (!channelId || !isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channel ID");
  }

  const channel = await User.findById(channelId);
  const loggedInUser = req.user?._id;
  const userSubscribed = await Subscription.findOneAndDelete({
    subscriber: loggedInUser,
    channel: channel,
  });

  if (userSubscribed) {
    return res
      .status(200)
      .json(
        new ApiResponse(200, "You have been unsubscribed from this channel")
      );
  }
  if (!userSubscribed) {
    const subscription = await Subscription.create({
      subscriber: loggedInUser,
      channel,
    });
    const createdSubscription = await Subscription.findById(subscription._id);
    if (!createdSubscription) {
      throw new ApiError(500, "Server error while creating the subscription");
    }
    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          createdSubscription,
          "Successfully subscribed to the channel"
        )
      );
  }
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  if (!channelId || !isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid Channel ID provided");
  }

  if (req.user?._id.toString() != channelId) {
    throw new ApiError(
      403,
      "Only the owner or admin can view other user's channel subscribers"
    );
  }
  const getSubscribers = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $facet: {
        subscribers: [
          {
            $lookup: {
              from: "users",
              localField: "subscriber",
              foreignField: "_id",
              as: "subscriber",
              pipeline: [
                {
                  $project: {
                    username: 1,
                    fullname: 1,
                    avatar: 1,
                    createdAt: 1,
                    updated: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              subscriber: {
                $first: "$subscriber",
              },
            },
          },
        ],
        subscribersCount: [
          {
            $count: "subscribers",
          },
        ],
      },
    },
  ]);
  return res
    .status(200)
    .json(new ApiResponse(200, getSubscribers[0], "All Subscribers fetched"));
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;
  if (!subscriberId) {
    console.log(subscriberId);
    throw new ApiError(400, "Invalid User ID");
  }

  if (req.user?._id.toString() != subscriberId) {
    throw new ApiError(403, "Unauthorized Access");
  }

  const getSubscribedChannels = await Subscription.aggregate([
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(subscriberId),
      },
    },
    {
      $facet: {
        channelsSubscribedTo: [
          {
            $lookup: {
              from: "users",
              localField: "channel",
              foreignField: "_id",
              as: "channel",
              pipeline: [
                {
                  $project: {
                    username: 1,
                    fullname: 1,
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
              channel: {
                $first: "$channel",
              },
            },
          },
        ],
        channelsSubscribedToCount: [{ $count: "channel" }],
      },
    },
  ]);
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        getSubscribedChannels[0],
        "Channels Subscribed fetched succcessfully"
      )
    );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
