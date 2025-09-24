import { UserScrapingService } from "../services/UserScrapingService.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const userScrapingService = new UserScrapingService();

/**
 * Scrape Reddit users and save to database
 */
const scrapeRedditUsers = asyncHandler(async (req, res) => {
  const { count = 100 } = req.body;

  try {
    console.log(`🔄 Starting Reddit user scraping for ${count} users...`);

    // Scrape users from Reddit
    const scrapedUsers = await userScrapingService.scrapeRedditUsers(count);

    if (scrapedUsers.length === 0) {
      return res
        .status(200)
        .json(new ApiResponse(200, { users: [], stats: { successCount: 0, errorCount: 0 } }, "No users found to scrape"));
    }

    // Save users to database
    const saveResult = await userScrapingService.saveUsersToDatabase(scrapedUsers);

    const result = {
      users: saveResult.savedUsers,
      stats: {
        totalScraped: scrapedUsers.length,
        successCount: saveResult.successCount,
        errorCount: saveResult.errorCount,
        totalProcessed: saveResult.totalProcessed
      }
    };

    return res
      .status(200)
      .json(new ApiResponse(200, result, `Successfully scraped and saved ${saveResult.successCount} Reddit users`));

  } catch (error) {
    console.error('Error in scrapeRedditUsers:', error.message);
    throw new ApiError(500, `Reddit user scraping failed: ${error.message}`);
  }
});

/**
 * Get platform users statistics
 */
const getPlatformUsersStats = asyncHandler(async (req, res) => {
  try {
    const { User } = await import("../models/user.model.js");
    
    const stats = await User.aggregate([
      {
        $group: {
          _id: "$userType",
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          userType: "$_id",
          count: 1,
          _id: 0
        }
      }
    ]);

    const totalUsers = await User.countDocuments();
    const platformUsers = await User.countDocuments({ userType: "platform" });
    const regularUsers = totalUsers - platformUsers;

    const result = {
      totalUsers,
      platformUsers,
      regularUsers,
      breakdown: stats
    };

    return res
      .status(200)
      .json(new ApiResponse(200, result, "Platform users stats fetched successfully"));

  } catch (error) {
    console.error('Error getting platform users stats:', error.message);
    throw new ApiError(500, `Failed to fetch platform users stats: ${error.message}`);
  }
});

/**
 * Get random platform users for testing
 */
const getRandomPlatformUsers = asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;

  try {
    const users = await userScrapingService.getPlatformUsers(null, parseInt(limit));

    return res
      .status(200)
      .json(new ApiResponse(200, users, `Retrieved ${users.length} random platform users`));

  } catch (error) {
    console.error('Error getting random platform users:', error.message);
    throw new ApiError(500, `Failed to get random platform users: ${error.message}`);
  }
});

export {
  scrapeRedditUsers,
  getPlatformUsersStats,
  getRandomPlatformUsers
};