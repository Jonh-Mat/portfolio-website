const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(
  process.env.MONGODB_URI || "mongodb://localhost:27017/blog-managemen",
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

// Blog Post Schema
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

// GET all posts
app.get("/api/posts", async (req, res) => {
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
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET single post
app.get("/api/posts/:id", async (req, res) => {
  try {
    const post = await BlogPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }
    res.json(post);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CREATE new post
app.post("/api/posts", async (req, res) => {
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
app.put("/api/posts/:id", async (req, res) => {
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
app.delete("/api/posts/:id", async (req, res) => {
  try {
    const post = await BlogPost.findByIdAndDelete(req.params.id);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }
    res.json({ message: "Post deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE post status (publish/draft)
app.patch("/api/posts/:id/status", async (req, res) => {
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
});

// INCREMENT views
app.patch("/api/posts/:id/view", async (req, res) => {
  try {
    const post = await BlogPost.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    );

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.json(post);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// TOGGLE like
app.patch("/api/posts/:id/like", async (req, res) => {
  try {
    const { increment } = req.body; // true to like, false to unlike

    const post = await BlogPost.findByIdAndUpdate(
      req.params.id,
      { $inc: { likes: increment ? 1 : -1 } },
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

    res.json(post);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET analytics/stats
app.get("/api/analytics/stats", async (req, res) => {
  try {
    const totalPosts = await BlogPost.countDocuments();
    const publishedPosts = await BlogPost.countDocuments({
      status: "published",
    });
    const draftPosts = await BlogPost.countDocuments({ status: "draft" });

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
      avgViews,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET category analytics
app.get("/api/analytics/categories", async (req, res) => {
  try {
    const categories = await BlogPost.aggregate([
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          totalViews: { $sum: "$views" },
          totalLikes: { $sum: "$likes" },
        },
      },
    ]);

    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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
