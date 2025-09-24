import { Comment } from "../models/comment.model.js";
import { Post } from "../models/post.model.js";
import { OpenAIService } from "./OpenAIService.js";
import { UserScrapingService } from "./UserScrapingService.js";

class CommentGenerationService {
  constructor() {
    this.openaiService = new OpenAIService();
    this.userScrapingService = new UserScrapingService();
  }

  /**
   * Generate and save comments for a post
   */
  async generateCommentsForPost(postId) {
    try {
      console.log(`🔄 Generating comments for post: ${postId}`);

      // Get the post
      const post = await Post.findById(postId);
      if (!post) {
        throw new Error('Post not found');
      }

      // Check if comments already exist for this post
      const existingComments = await Comment.countDocuments({ post: postId });
      if (existingComments > 0) {
        console.log(`Post ${postId} already has ${existingComments} comments, skipping...`);
        return { postId, commentsCreated: 0, message: 'Comments already exist' };
      }

      // Generate comments using OpenAI
      const commentTexts = await this.openaiService.generateComments(
        post.title,
        post.content,
        Math.floor(Math.random() * 6) + 10 // 10-15 comments
      );

      if (commentTexts.length === 0) {
        console.log(`No comments generated for post ${postId}`);
        return { postId, commentsCreated: 0, message: 'No comments generated' };
      }

      // Get platform users for comment assignment
      const platformUsers = await this.userScrapingService.getPlatformUsers(post.owner, 50);
      if (platformUsers.length === 0) {
        throw new Error('No platform users available for comment assignment');
      }

      // Create and save comments
      const createdComments = [];
      let commentsCreated = 0;

      for (const commentText of commentTexts) {
        try {
          // Randomly select a user (excluding post owner)
          const randomUser = platformUsers[Math.floor(Math.random() * platformUsers.length)];
          
          // Generate random like count
          const likes = Math.floor(Math.random() * 200) + 1;

          // Create comment
          const comment = await Comment.create({
            content: commentText,
            post: postId,
            owner: randomUser._id,
            likes: likes,
            parentComment: null,
          });

          createdComments.push(comment);
          commentsCreated++;

        } catch (error) {
          console.error(`Error creating comment: ${error.message}`);
        }
      }

      // Update post comment count
      await Post.findByIdAndUpdate(postId, {
        $inc: { "localEngagement.comments": commentsCreated },
      });

      console.log(`✅ Created ${commentsCreated} comments for post ${postId}`);
      
      return {
        postId,
        commentsCreated,
        totalGenerated: commentTexts.length,
        comments: createdComments
      };

    } catch (error) {
      console.error(`Error generating comments for post ${postId}:`, error.message);
      throw error;
    }
  }

  /**
   * Generate comments for multiple posts in batch
   */
  async generateCommentsForPosts(postIds) {
    try {
      console.log(`🔄 Generating comments for ${postIds.length} posts...`);

      const results = [];
      let totalCommentsCreated = 0;

      for (const postId of postIds) {
        try {
          const result = await this.generateCommentsForPost(postId);
          results.push(result);
          totalCommentsCreated += result.commentsCreated;

          // Small delay between posts to avoid overwhelming the system
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
          console.error(`Error processing post ${postId}:`, error.message);
          results.push({
            postId,
            commentsCreated: 0,
            error: error.message
          });
        }
      }

      console.log(`✅ Batch comment generation completed: ${totalCommentsCreated} total comments created`);
      
      return {
        totalPosts: postIds.length,
        totalCommentsCreated,
        results
      };

    } catch (error) {
      console.error('Error in batch comment generation:', error.message);
      throw error;
    }
  }

  /**
   * Generate comments for recent posts without comments
   */
  async generateCommentsForRecentPosts(limit = 10) {
    try {
      console.log(`🔍 Finding recent posts without comments (limit: ${limit})...`);

      // Find recent posts that don't have comments
      const posts = await Post.aggregate([
        { $match: { status: 'active' } },
        {
          $lookup: {
            from: 'comments',
            localField: '_id',
            foreignField: 'post',
            as: 'comments'
          }
        },
        { $match: { 'comments.0': { $exists: false } } }, // Posts with no comments
        { $sort: { createdAt: -1 } },
        { $limit: limit },
        { $project: { _id: 1, title: 1, content: 1, owner: 1 } }
      ]);

      if (posts.length === 0) {
        console.log('No recent posts without comments found');
        return { totalPosts: 0, totalCommentsCreated: 0, results: [] };
      }

      console.log(`Found ${posts.length} posts without comments`);

      const postIds = posts.map(post => post._id);
      return await this.generateCommentsForPosts(postIds);

    } catch (error) {
      console.error('Error generating comments for recent posts:', error.message);
      throw error;
    }
  }

  /**
   * Get comment generation statistics
   */
  async getCommentGenerationStats() {
    try {
      const stats = await Comment.aggregate([
        {
          $group: {
            _id: null,
            totalComments: { $sum: 1 },
            totalLikes: { $sum: '$likes' },
            avgLikes: { $avg: '$likes' },
            postsWithComments: { $addToSet: '$post' }
          }
        },
        {
          $project: {
            _id: 0,
            totalComments: 1,
            totalLikes: 1,
            avgLikes: { $round: ['$avgLikes', 2] },
            postsWithComments: { $size: '$postsWithComments' }
          }
        }
      ]);

      const totalPosts = await Post.countDocuments({ status: 'active' });
      
      return {
        ...stats[0],
        totalPosts,
        postsWithoutComments: totalPosts - (stats[0]?.postsWithComments || 0)
      };

    } catch (error) {
      console.error('Error getting comment generation stats:', error.message);
      throw error;
    }
  }
}

export { CommentGenerationService };