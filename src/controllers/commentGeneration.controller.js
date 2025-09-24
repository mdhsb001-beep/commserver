import { CommentGenerationService } from "../services/CommentGenerationService.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const commentGenerationService = new CommentGenerationService();

/**
 * Generate comments for a specific post
 */
const generateCommentsForPost = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  if (!postId) {
    throw new ApiError(400, "Post ID is required");
  }

  try {
    const result = await commentGenerationService.generateCommentsForPost(postId);

    return res
      .status(200)
      .json(new ApiResponse(200, result, `Generated ${result.commentsCreated} comments for post`));

  } catch (error) {
    console.error(`Error generating comments for post ${postId}:`, error.message);
    throw new ApiError(500, `Comment generation failed: ${error.message}`);
  }
});

/**
 * Generate comments for multiple posts
 */
const generateCommentsForPosts = asyncHandler(async (req, res) => {
  const { postIds } = req.body;

  if (!postIds || !Array.isArray(postIds) || postIds.length === 0) {
    throw new ApiError(400, "Post IDs array is required");
  }

  try {
    const result = await commentGenerationService.generateCommentsForPosts(postIds);

    return res
      .status(200)
      .json(new ApiResponse(200, result, `Generated comments for ${result.totalPosts} posts`));

  } catch (error) {
    console.error('Error generating comments for posts:', error.message);
    throw new ApiError(500, `Batch comment generation failed: ${error.message}`);
  }
});

/**
 * Generate comments for recent posts without comments
 */
const generateCommentsForRecentPosts = asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;

  try {
    const result = await commentGenerationService.generateCommentsForRecentPosts(parseInt(limit));

    return res
      .status(200)
      .json(new ApiResponse(200, result, `Generated comments for ${result.totalPosts} recent posts`));

  } catch (error) {
    console.error('Error generating comments for recent posts:', error.message);
    throw new ApiError(500, `Recent posts comment generation failed: ${error.message}`);
  }
});

/**
 * Get comment generation statistics
 */
const getCommentGenerationStats = asyncHandler(async (req, res) => {
  try {
    const stats = await commentGenerationService.getCommentGenerationStats();

    return res
      .status(200)
      .json(new ApiResponse(200, stats, "Comment generation stats fetched successfully"));

  } catch (error) {
    console.error('Error getting comment generation stats:', error.message);
    throw new ApiError(500, `Failed to fetch comment generation stats: ${error.message}`);
  }
});

export {
  generateCommentsForPost,
  generateCommentsForPosts,
  generateCommentsForRecentPosts,
  getCommentGenerationStats
};