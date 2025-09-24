import { Router } from "express";
import {
  scrapeRedditUsers,
  getPlatformUsersStats,
  getRandomPlatformUsers
} from "../controllers/userScraping.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// All user scraping routes require authentication
router.use(verifyJWT);

/**
 * Scrape Reddit users
 * POST /api/v1/user-scraping/reddit
 * Body: { count: 100 }
 */
router.route("/reddit").post(scrapeRedditUsers);

/**
 * Get platform users statistics
 * GET /api/v1/user-scraping/stats
 */
router.route("/stats").get(getPlatformUsersStats);

/**
 * Get random platform users for testing
 * GET /api/v1/user-scraping/random?limit=10
 */
router.route("/random").get(getRandomPlatformUsers);

export default router;