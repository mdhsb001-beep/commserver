import { Router } from "express";
import {
  generateCommentsForPost,
  generateCommentsForPosts,
  generateCommentsForRecentPosts,
  getCommentGenerationStats
} from "../controllers/commentGeneration.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// All comment generation routes require authentication
router.use(verifyJWT);

/**
 * Generate comments for a specific post
 * POST /api/v1/comment-generation/post/:postId
 */
router.route("/post/:postId").post(generateCommentsForPost);

/**
 * Generate comments for multiple posts
 * POST /api/v1/comment-generation/posts
 * Body: { postIds: ["id1", "id2", ...] }
 */
router.route("/posts").post(generateCommentsForPosts);

/**
 * Generate comments for recent posts without comments
 * POST /api/v1/comment-generation/recent?limit=10
 */
router.route("/recent").post(generateCommentsForRecentPosts);

/**
 * Get comment generation statistics
 * GET /api/v1/comment-generation/stats
 */
router.route("/stats").get(getCommentGenerationStats);

export default router;