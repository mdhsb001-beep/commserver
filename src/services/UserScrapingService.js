import axios from "axios";
import { User } from "../models/user.model.js";
import { ScrapingUtils } from "../scrapers/utils/ScrapingUtils.js";

class UserScrapingService {
  constructor() {
    this.utils = new ScrapingUtils();
    this.rateLimitDelay = 2000; // 2 seconds between requests
    this.usernamesPrefixes = [
      'real_', 'the_', 'pro_', 'user_', 'biz_', 'tech_', 'smart_', 'cool_',
      'new_', 'top_', 'best_', 'good_', 'fast_', 'big_', 'old_', 'young_'
    ];
  }

  /**
   * Scrape Reddit users from US-focused subreddits
   */
  async scrapeRedditUsers(targetCount = 100) {
    try {
      console.log(`🔍 Starting to scrape ${targetCount} Reddit users...`);
      
      const users = [];
      const usSubreddits = [
        'entrepreneur', 'smallbusiness', 'startups', 'business',
        'marketing', 'sales', 'personalfinance', 'investing'
      ];
      
      const usersPerSubreddit = Math.ceil(targetCount / usSubreddits.length);
      
      for (const subreddit of usSubreddits) {
        if (users.length >= targetCount) break;
        
        try {
          const subredditUsers = await this.scrapeSubredditUsers(subreddit, usersPerSubreddit);
          users.push(...subredditUsers);
          
          console.log(`Scraped ${subredditUsers.length} users from r/${subreddit}`);
          await this.utils.delay(this.rateLimitDelay);
        } catch (error) {
          console.error(`Error scraping users from r/${subreddit}:`, error.message);
        }
      }
      
      const uniqueUsers = this.removeDuplicateUsers(users);
      const finalUsers = uniqueUsers.slice(0, targetCount);
      
      console.log(`✅ Successfully scraped ${finalUsers.length} unique users`);
      return finalUsers;
      
    } catch (error) {
      console.error('Error in scrapeRedditUsers:', error.message);
      throw error;
    }
  }

  /**
   * Scrape users from a specific subreddit
   */
  async scrapeSubredditUsers(subreddit, limit = 25) {
    try {
      const url = `https://www.reddit.com/r/${subreddit}/hot.json`;
      
      const response = await axios.get(url, {
        params: {
          limit: limit,
          raw_json: 1,
        },
        headers: {
          'User-Agent': 'UserScrapingBot/1.0 (by /u/CommunityBot)',
        },
        timeout: 15000,
      });

      if (!response.data?.data?.children) {
        return [];
      }

      const users = [];
      const seenUsernames = new Set();

      for (const post of response.data.data.children) {
        const postData = post.data;
        
        if (postData.author && 
            postData.author !== '[deleted]' && 
            postData.author !== 'AutoModerator' &&
            !seenUsernames.has(postData.author)) {
          
          seenUsernames.add(postData.author);
          
          const userData = await this.createUserData(postData.author, subreddit);
          if (userData) {
            users.push(userData);
          }
        }
      }

      return users;
    } catch (error) {
      if (error.response?.status === 429) {
        console.log("Rate limited, waiting longer...");
        await this.utils.delay(10000);
        return this.scrapeSubredditUsers(subreddit, limit);
      }
      
      throw error;
    }
  }

  /**
   * Create user data object with realistic modifications
   */
  async createUserData(originalUsername, subreddit) {
    try {
      // Add realistic prefix to make username unique
      const prefix = this.usernamesPrefixes[Math.floor(Math.random() * this.usernamesPrefixes.length)];
      const modifiedUsername = `${prefix}${originalUsername}`.toLowerCase();
      
      // Check if user already exists
      const existingUser = await User.findOne({ username: modifiedUsername });
      if (existingUser) {
        return null; // Skip if already exists
      }

      // Generate realistic avatar URL
      const avatarUrl = this.generateAvatarUrl(originalUsername);
      
      // Generate realistic full name
      const fullName = this.generateFullName(originalUsername);

      return {
        username: modifiedUsername,
        email: `${modifiedUsername}@example.com`,
        fullName: fullName,
        avatar: avatarUrl,
        userType: 'platform',
        sourceSubreddit: subreddit,
        originalUsername: originalUsername,
        password: 'defaultPassword123', // Will be hashed by the model
      };
    } catch (error) {
      console.error(`Error creating user data for ${originalUsername}:`, error.message);
      return null;
    }
  }

  /**
   * Generate realistic avatar URL
   */
  generateAvatarUrl(username) {
    // Use a service that generates consistent avatars based on username
    const seed = username.toLowerCase();
    return `https://api.dicebear.com/7.x/avataaars/png?seed=${seed}&size=400`;
  }

  /**
   * Generate realistic full name
   */
  generateFullName(username) {
    const firstNames = [
      'Alex', 'Jordan', 'Taylor', 'Casey', 'Morgan', 'Riley', 'Avery', 'Quinn',
      'Blake', 'Cameron', 'Drew', 'Emery', 'Finley', 'Harper', 'Hayden', 'Jamie',
      'Kendall', 'Logan', 'Parker', 'Peyton', 'Reese', 'Sage', 'Skyler', 'Tanner'
    ];
    
    const lastNames = [
      'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
      'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
      'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson'
    ];
    
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    
    return `${firstName} ${lastName}`;
  }

  /**
   * Remove duplicate users based on username
   */
  removeDuplicateUsers(users) {
    const seen = new Set();
    return users.filter(user => {
      if (seen.has(user.username)) {
        return false;
      }
      seen.add(user.username);
      return true;
    });
  }

  /**
   * Save scraped users to database
   */
  async saveUsersToDatabase(users) {
    try {
      console.log(`💾 Saving ${users.length} users to database...`);
      
      const savedUsers = [];
      let successCount = 0;
      let errorCount = 0;

      for (const userData of users) {
        try {
          // Check if user already exists
          const existingUser = await User.findOne({ 
            $or: [
              { username: userData.username },
              { email: userData.email }
            ]
          });

          if (existingUser) {
            console.log(`User ${userData.username} already exists, skipping...`);
            continue;
          }

          const user = await User.create(userData);
          savedUsers.push(user);
          successCount++;
          
        } catch (error) {
          console.error(`Error saving user ${userData.username}:`, error.message);
          errorCount++;
        }
      }

      console.log(`✅ Successfully saved ${successCount} users, ${errorCount} errors`);
      return {
        savedUsers,
        successCount,
        errorCount,
        totalProcessed: users.length
      };
      
    } catch (error) {
      console.error('Error in saveUsersToDatabase:', error.message);
      throw error;
    }
  }

  /**
   * Get platform users for comment assignment
   */
  async getPlatformUsers(excludeUserId = null, limit = 50) {
    try {
      const query = { userType: 'platform' };
      if (excludeUserId) {
        query._id = { $ne: excludeUserId };
      }

      const users = await User.find(query)
        .select('_id username fullName avatar')
        .limit(limit);

      return users;
    } catch (error) {
      console.error('Error getting platform users:', error.message);
      throw error;
    }
  }

  /**
   * Get random platform user (excluding specific user)
   */
  async getRandomPlatformUser(excludeUserId = null) {
    try {
      const users = await this.getPlatformUsers(excludeUserId, 100);
      if (users.length === 0) {
        throw new Error('No platform users available');
      }
      
      return users[Math.floor(Math.random() * users.length)];
    } catch (error) {
      console.error('Error getting random platform user:', error.message);
      throw error;
    }
  }
}

export { UserScrapingService };