import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.models.js";
import { Video } from "../models/video.models.js";
import { Like } from "../models/like.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
  //TODO: get all comments for a video
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const pageNum = Number(page);
  const limitNum = Number(limit);

  if (!pageNum || !limitNum || pageNum === 0) {
    throw new ApiError(400, "Please Provide valid input");
  }

  if (!videoId || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Please provide valid video ID");
  }

  const getComments = await Comment.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $skip: (pageNum - 1) * limitNum,
    },
    {
      $limit: limitNum,
    },
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
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "comment",
        as: "totalLikesOnComment",
      },
    },
    {
      $addFields: {
        likeByUser: {
          $in: [req.user?._id, "$totalLikesOnComment.likedBy"],
        },
      },
    },
    {
      $group: {
        _id: "$_id",
        content: { $first: "$content" },
        video: { $first: "$video" },
        owner: { $first: "$owner" },
        createdAt: { $first: "$createdAt" },
        updatedAt: { $first: "$updatedAt" },
        totalLikeOnComment: { $sum: { $size: "$totalLikesOnComment" } },
        likedByUser: { $first: "$likedByUser" },
      },
    },
    {
      $addFields: {
        owner: {
          $first: "$owner",
        },
        isOwner: {
          $cond: {
            if: { $eq: [req.user?._id, { $arrayElemAt: ["$onwer._id", 0] }] },
            then: true,
            else: false,
          },
        },
      },
    },
  ]);
  if (!getComments?.length) {
    throw new ApiError(404, "No comments found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, getComments, "Comments fetched successfully"));
});

const addComment = asyncHandler(async (req, res) => {
  // TODO: add a comment to a video
  const { comment } = req.body;
  const { videoId } = req.params;
  if (!comment || comment.trim() === "") {
    throw new ApiError(400, "Provide the comment");
  }
  if (!videoId || !isValidObjectId(videoId)) {
    throw new ApiError(404, "Invalid Video ID");
  }
  const loggedInUser = req.user?._id;

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  const createdComment = await Comment.create({
    content: comment,
    video,
    owner: loggedInUser,
  });

  const postedComment = await Comment.findById(createdComment._id);
  if (!postedComment) {
    throw new ApiError(500, "Something went wrong while creating the comment");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, postedComment, "The comment was added successfully")
    );
});

const updateComment = asyncHandler(async (req, res) => {
  // TODO: update a comment
  const { comment } = req.body;
  const { commentId } = req.params;
  if (!comment || comment.trim() === "") {
    throw new ApiError(400, "Please provide the updated comment.");
  }

  if (!commentId || !isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment Id provided.");
  }

  const originalComment = await Comment.findById(commentId);
  if (!originalComment) {
    throw new ApiError(400, "This comment does not exist.");
  }
  if (originalComment.owner.toString() != req.user?._id.toString()) {
    throw new ApiError(401, "You are not authorized for this job");
  }

  const newComment = await Comment.findByIdAndUpdate(
    commentId,
    {
      $set: {
        content: comment,
      },
    },
    {
      new: true,
    }
  );
  if (!newComment) {
    throw new ApiError(500, "Something went  wrong when updating the comment.");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, newComment, "Comment has been updated"));
});

const deleteComment = asyncHandler(async (req, res) => {
  // TODO: delete a comment
  const { commentId } = req.params;
  if (!commentId || !isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment ID");
  }
  const comment = await Comment.findById(commentId);

  if (!comment) {
    throw new ApiError(404, "Comment does not exist");
  }

  if (comment.owner.toString() != req.user?._id.toString()) {
    throw new ApiError(400, "You are not authorized for this job");
  }

  const deletedComment = await Comment.findByIdAndDelete(commentId);
  if (!deleteComment) {
    throw new ApiError(500, "Something went wrong while deleting the comment");
  }
  await Like.deleteMany({ comment: comment._id });

  return res
    .status(200)
    .json(new ApiResponse(200, "Comment deleted successfully"));
});

export { getVideoComments, addComment, updateComment, deleteComment };
