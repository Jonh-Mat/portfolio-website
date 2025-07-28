const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(
  process.env.MONGODB_URI || "mongodb://localhost:27017/blog-management",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", () => {
  console.log("Connected to MongoDB");
});

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["user", "admin"], default: "user" },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);

// Comment Schema
const commentSchema = new mongoose.Schema({
  content: { type: String, required: true, trim: true },
  author: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    username: { type: String, required: true },
  },
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "BlogPost",
    required: true,
  },
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Comment",
    default: null,
  }, // For nested replies
  likes: { type: Number, default: 0 },
  likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Comment = mongoose.model("Comment", commentSchema);

// User Interaction Schema (for tracking likes and views per user)
const userInteractionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "BlogPost",
    required: true,
  },
  hasLiked: { type: Boolean, default: false },
  hasViewed: { type: Boolean, default: false },
  viewedAt: { type: Date },
  likedAt: { type: Date },
});

// Create compound index to ensure one interaction record per user-post combination
userInteractionSchema.index({ userId: 1, postId: 1 }, { unique: true });

const UserInteraction = mongoose.model(
  "UserInteraction",
  userInteractionSchema
);

// Auth Middleware
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token)
      return res.status(401).json({ error: "Authentication required" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
};

const adminMiddleware = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

// Blog Post Schema (enhanced with comments count)
const blogPostSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    excerpt: {
      type: String,
      required: true,
      trim: true,
    },
    author: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
    },
    readTime: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
      enum: ["Technology", "Design", "Development"],
    },
    image: {
      type: String,
      required: true,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },
    views: {
      type: Number,
      default: 0,
    },
    likes: {
      type: Number,
      default: 0,
    },
    commentsCount: {
      type: Number,
      default: 0,
    },
    content: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

const BlogPost = mongoose.model("BlogPost", blogPostSchema);

// Routes

// Registration
app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({ username, email, password: hashedPassword });
    await user.save();

    res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );
    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET all posts (with user interaction data)
app.get("/api/posts", authMiddleware, async (req, res) => {
  try {
    const {
      status,
      category,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    let filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;

    const sortOrder = order === "desc" ? -1 : 1;
    const sortObj = { [sortBy]: sortOrder };

    const posts = await BlogPost.find(filter).sort(sortObj);

    // Get user interactions for these posts
    const postIds = posts.map((post) => post._id);
    const userInteractions = await UserInteraction.find({
      userId: req.user._id,
      postId: { $in: postIds },
    });

    // Create a map for quick lookup
    const interactionMap = {};
    userInteractions.forEach((interaction) => {
      interactionMap[interaction.postId.toString()] = interaction;
    });

    // Add interaction data to posts
    const postsWithInteractions = posts.map((post) => {
      const interaction = interactionMap[post._id.toString()];
      return {
        ...post.toObject(),
        userHasLiked: interaction ? interaction.hasLiked : false,
        userHasViewed: interaction ? interaction.hasViewed : false,
      };
    });

    res.json(postsWithInteractions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET single post (with user interaction data)
app.get("/api/posts/:id", authMiddleware, async (req, res) => {
  try {
    const post = await BlogPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Get user interaction for this post
    const userInteraction = await UserInteraction.findOne({
      userId: req.user._id,
      postId: req.params.id,
    });

    const postWithInteraction = {
      ...post.toObject(),
      userHasLiked: userInteraction ? userInteraction.hasLiked : false,
      userHasViewed: userInteraction ? userInteraction.hasViewed : false,
    };

    res.json(postWithInteraction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CREATE new post
app.post("/api/posts", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { tags, ...postData } = req.body;

    // Convert tags string to array if it's a string
    let tagsArray = [];
    if (tags) {
      tagsArray =
        typeof tags === "string"
          ? tags
              .split(",")
              .map((tag) => tag.trim())
              .filter((tag) => tag.length > 0)
          : tags;
    }

    const post = new BlogPost({
      ...postData,
      tags: tagsArray,
    });

    const savedPost = await post.save();
    res.status(201).json(savedPost);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// UPDATE post
app.put("/api/posts/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { tags, ...postData } = req.body;

    // Convert tags string to array if it's a string
    let tagsArray = [];
    if (tags) {
      tagsArray =
        typeof tags === "string"
          ? tags
              .split(",")
              .map((tag) => tag.trim())
              .filter((tag) => tag.length > 0)
          : tags;
    }

    const post = await BlogPost.findByIdAndUpdate(
      req.params.id,
      { ...postData, tags: tagsArray },
      { new: true, runValidators: true }
    );

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.json(post);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE post
app.delete(
  "/api/posts/:id",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const post = await BlogPost.findByIdAndDelete(req.params.id);
      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }

      // Clean up related data
      await Comment.deleteMany({ postId: req.params.id });
      await UserInteraction.deleteMany({ postId: req.params.id });

      res.json({ message: "Post deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// UPDATE post status (publish/draft)
app.patch(
  "/api/posts/:id/status",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { status } = req.body;

      if (!["draft", "published"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const post = await BlogPost.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true }
      );

      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }

      res.json(post);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

// INCREMENT views (improved to track per user)
app.patch("/api/posts/:id/view", authMiddleware, async (req, res) => {
  try {
    // Check if user already viewed this post
    let userInteraction = await UserInteraction.findOne({
      userId: req.user._id,
      postId: req.params.id,
    });

    let viewIncremented = false;

    if (!userInteraction) {
      // Create new interaction record
      userInteraction = new UserInteraction({
        userId: req.user._id,
        postId: req.params.id,
        hasViewed: true,
        viewedAt: new Date(),
      });
      await userInteraction.save();
      viewIncremented = true;
    } else if (!userInteraction.hasViewed) {
      // Update existing record
      userInteraction.hasViewed = true;
      userInteraction.viewedAt = new Date();
      await userInteraction.save();
      viewIncremented = true;
    }

    // Increment post view count if this is a new view
    let post;
    if (viewIncremented) {
      post = await BlogPost.findByIdAndUpdate(
        req.params.id,
        { $inc: { views: 1 } },
        { new: true }
      );
    } else {
      post = await BlogPost.findById(req.params.id);
    }

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.json({
      ...post.toObject(),
      userHasViewed: true,
      userHasLiked: userInteraction.hasLiked,
      viewIncremented,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// TOGGLE like (improved to track per user)
app.patch("/api/posts/:id/like", authMiddleware, async (req, res) => {
  try {
    // Find or create user interaction
    let userInteraction = await UserInteraction.findOne({
      userId: req.user._id,
      postId: req.params.id,
    });

    let likeChange = 0;
    let newLikeStatus;

    if (!userInteraction) {
      // Create new interaction record with like
      userInteraction = new UserInteraction({
        userId: req.user._id,
        postId: req.params.id,
        hasLiked: true,
        likedAt: new Date(),
      });
      likeChange = 1;
      newLikeStatus = true;
    } else {
      // Toggle like status
      if (userInteraction.hasLiked) {
        userInteraction.hasLiked = false;
        userInteraction.likedAt = null;
        likeChange = -1;
        newLikeStatus = false;
      } else {
        userInteraction.hasLiked = true;
        userInteraction.likedAt = new Date();
        likeChange = 1;
        newLikeStatus = true;
      }
    }

    await userInteraction.save();

    // Update post like count
    const post = await BlogPost.findByIdAndUpdate(
      req.params.id,
      { $inc: { likes: likeChange } },
      { new: true }
    );

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Ensure likes don't go below 0
    if (post.likes < 0) {
      post.likes = 0;
      await post.save();
    }

    res.json({
      ...post.toObject(),
      userHasLiked: newLikeStatus,
      userHasViewed: userInteraction.hasViewed,
      likeChange,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// COMMENT ROUTES

// GET comments for a post
app.get("/api/posts/:id/comments", authMiddleware, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    const sortOrder = order === "desc" ? -1 : 1;
    const sortObj = { [sortBy]: sortOrder };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get top-level comments (no parent)
    const comments = await Comment.find({
      postId: req.params.id,
      parentComment: null,
    })
      .populate("author.id", "username")
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit));

    // Get replies for each comment
    const commentsWithReplies = await Promise.all(
      comments.map(async (comment) => {
        const replies = await Comment.find({ parentComment: comment._id })
          .populate("author.id", "username")
          .sort({ createdAt: 1 }); // Replies sorted chronologically

        return {
          ...comment.toObject(),
          replies,
          repliesCount: replies.length,
        };
      })
    );

    const totalComments = await Comment.countDocuments({
      postId: req.params.id,
      parentComment: null,
    });

    res.json({
      comments: commentsWithReplies,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalComments / parseInt(limit)),
        totalComments,
        hasMore: skip + comments.length < totalComments,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CREATE comment
app.post("/api/posts/:id/comments", authMiddleware, async (req, res) => {
  try {
    const { content, parentComment } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: "Comment content is required" });
    }

    // Verify post exists
    const post = await BlogPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // If replying to a comment, verify parent comment exists
    if (parentComment) {
      const parent = await Comment.findById(parentComment);
      if (!parent || parent.postId.toString() !== req.params.id) {
        return res.status(400).json({ error: "Invalid parent comment" });
      }
    }

    const comment = new Comment({
      content: content.trim(),
      author: {
        id: req.user._id,
        username: req.user.username,
      },
      postId: req.params.id,
      parentComment: parentComment || null,
    });

    await comment.save();
    await comment.populate("author.id", "username");

    // Update post comment count (only for top-level comments)
    if (!parentComment) {
      await BlogPost.findByIdAndUpdate(req.params.id, {
        $inc: { commentsCount: 1 },
      });
    }

    res.status(201).json(comment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// UPDATE comment
app.put("/api/comments/:id", authMiddleware, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: "Comment content is required" });
    }

    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    // Check if user owns the comment or is admin
    if (
      comment.author.id.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res
        .status(403)
        .json({ error: "Not authorized to update this comment" });
    }

    comment.content = content.trim();
    comment.updatedAt = new Date();
    await comment.save();

    res.json(comment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE comment
app.delete("/api/comments/:id", authMiddleware, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    // Check if user owns the comment or is admin
    if (
      comment.author.id.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res
        .status(403)
        .json({ error: "Not authorized to delete this comment" });
    }

    const postId = comment.postId;
    const isTopLevel = !comment.parentComment;

    // Delete comment and its replies
    await Comment.deleteMany({
      $or: [{ _id: req.params.id }, { parentComment: req.params.id }],
    });

    // Update post comment count (only for top-level comments)
    if (isTopLevel) {
      await BlogPost.findByIdAndUpdate(postId, {
        $inc: { commentsCount: -1 },
      });
    }

    res.json({ message: "Comment deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// LIKE/UNLIKE comment
app.patch("/api/comments/:id/like", authMiddleware, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    const userId = req.user._id;
    const hasLiked = comment.likedBy.includes(userId);

    if (hasLiked) {
      // Unlike
      comment.likedBy = comment.likedBy.filter(
        (id) => id.toString() !== userId.toString()
      );
      comment.likes = Math.max(0, comment.likes - 1);
    } else {
      // Like
      comment.likedBy.push(userId);
      comment.likes += 1;
    }

    await comment.save();

    res.json({
      ...comment.toObject(),
      userHasLiked: !hasLiked,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET analytics/stats
app.get(
  "/api/analytics/stats",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const totalPosts = await BlogPost.countDocuments();
      const publishedPosts = await BlogPost.countDocuments({
        status: "published",
      });
      const draftPosts = await BlogPost.countDocuments({ status: "draft" });
      const totalComments = await Comment.countDocuments();

      const posts = await BlogPost.find({});
      const totalViews = posts.reduce((sum, post) => sum + post.views, 0);
      const totalLikes = posts.reduce((sum, post) => sum + post.likes, 0);
      const avgViews = totalPosts > 0 ? Math.round(totalViews / totalPosts) : 0;

      res.json({
        totalPosts,
        publishedPosts,
        draftPosts,
        totalViews,
        totalLikes,
        totalComments,
        avgViews,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// GET category analytics
app.get(
  "/api/analytics/categories",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const categories = await BlogPost.aggregate([
        {
          $group: {
            _id: "$category",
            count: { $sum: 1 },
            totalViews: { $sum: "$views" },
            totalLikes: { $sum: "$likes" },
            totalComments: { $sum: "$commentsCount" },
          },
        },
      ]);

      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

app.get(
  "/api/analytics/monthly",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const pipeline = [
        { $match: { status: "published" } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$date" } },
            views: { $sum: "$views" },
            likes: { $sum: "$likes" },
          },
        },
        { $sort: { "_id": 1 } },
      ];
      const results = await BlogPost.aggregate(pipeline);
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
