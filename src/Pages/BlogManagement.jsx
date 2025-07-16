import { useState, useEffect } from "react";
import axios from "axios";

const BlogManagement = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalPosts: 0,
    publishedPosts: 0,
    draftPosts: 0,
    totalViews: 0,
    totalLikes: 0,
    avgViews: 0,
  });
  const [categoryAnalytics, setCategoryAnalytics] = useState([]);
  const [formData, setFormData] = useState({
    title: "",
    excerpt: "",
    author: "",
    date: "",
    readTime: "",
    category: "",
    image: "",
    tags: "",
    content: "",
    status: "draft",
  });

  const API_URL = "http://localhost:5000/api";

  // Fetch posts from backend
  const fetchPosts = async (params = {}) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/posts`, { params });
      setPosts(response.data);
    } catch (err) {
      setError("Failed to fetch posts");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch analytics data
  const fetchAnalytics = async () => {
    try {
      const statsRes = await axios.get(`${API_URL}/analytics/stats`);
      setStats(statsRes.data);

      const categoriesRes = await axios.get(`${API_URL}/analytics/categories`);
      setCategoryAnalytics(categoriesRes.data);
    } catch (err) {
      setError("Failed to fetch analytics");
      console.error(err);
    }
  };

  // Create new post
  const createPost = async (e) => {
    e.preventDefault();
    try {
      const postData = {
        ...formData,
        tags: formData.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag),
        date: new Date(formData.date),
      };

      const response = await axios.post(`${API_URL}/posts`, postData);
      setPosts([...posts, response.data]);
      setActiveTab("posts");
      resetForm();
    } catch (err) {
      setError("Failed to create post");
      console.error(err);
    }
  };

  // Update post status
  const updatePostStatus = async (id, status) => {
    try {
      await axios.patch(`${API_URL}/posts/${id}/status`, { status });
      fetchPosts();
    } catch (err) {
      setError("Failed to update status");
      console.error(err);
    }
  };

  // Delete post
  const deletePost = async (id) => {
    try {
      await axios.delete(`${API_URL}/posts/${id}`);
      setPosts(posts.filter((post) => post._id !== id));
    } catch (err) {
      setError("Failed to delete post");
      console.error(err);
    }
  };

  // Increment views
  const incrementViews = async (id) => {
    try {
      await axios.patch(`${API_URL}/posts/${id}/view`);
      // Optimistically update UI
      setPosts(
        posts.map((post) =>
          post._id === id ? { ...post, views: post.views + 1 } : post
        )
      );
    } catch (err) {
      console.error("Failed to increment views", err);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      title: "",
      excerpt: "",
      author: "",
      date: "",
      readTime: "",
      category: "",
      image: "",
      tags: "",
      content: "",
      status: "draft",
    });
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Fetch data on component mount and tab changes
  useEffect(() => {
    if (activeTab === "posts" || activeTab === "dashboard") {
      fetchPosts({ status: "published" });
    }

    if (activeTab === "dashboard" || activeTab === "analytics") {
      fetchAnalytics();
    }
  }, [activeTab]);

  // StatCard Component
  const StatCard = ({ title, value, icon, trend, trendValue }) => (
    <div className="bg-black-100 border border-black-50 rounded-xl p-6 hover:border-white-50 transition-all duration-300 group">
      <div className="flex items-center justify-between mb-4">
        <div className="text-white-50 text-sm font-medium">{title}</div>
        <div className="text-blue-50 text-2xl">{icon}</div>
      </div>
      <div className="text-3xl font-bold text-white mb-2">{value}</div>
      {trend && (
        <div
          className={`text-sm flex items-center gap-1 ${
            trend === "up" ? "text-green-400" : "text-red-400"
          }`}
        >
          <span>{trend === "up" ? "↗" : "↘"}</span>
          <span>{trendValue}</span>
        </div>
      )}
    </div>
  );

  // TabButton Component
  const TabButton = ({ id, label, active, onClick }) => (
    <button
      onClick={() => onClick(id)}
      className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
        active
          ? "bg-white text-black"
          : "bg-black-200 text-white-50 hover:text-white border border-black-50 hover:border-white-50"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <section className="section-padding">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white via-blue-50 to-white bg-clip-text text-transparent">
            Blog Management
          </h1>
          <p className="text-white-50 text-lg">
            Manage your blog posts, track analytics, and create new content
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-4 mb-12">
          <TabButton
            id="dashboard"
            label="Dashboard"
            active={activeTab === "dashboard"}
            onClick={setActiveTab}
          />
          <TabButton
            id="posts"
            label="All Posts"
            active={activeTab === "posts"}
            onClick={setActiveTab}
          />
          <TabButton
            id="create"
            label="Create Post"
            active={activeTab === "create"}
            onClick={setActiveTab}
          />
          <TabButton
            id="analytics"
            label="Analytics"
            active={activeTab === "analytics"}
            onClick={setActiveTab}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 text-red-400 rounded-lg">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-400"></div>
            <p className="mt-4 text-white-50">Loading data...</p>
          </div>
        )}

        {/* Dashboard Tab */}
        {!loading && activeTab === "dashboard" && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <StatCard
                title="Total Posts"
                value={stats.totalPosts}
                icon="📝"
                trend="up"
                trendValue="+12%"
              />
              <StatCard
                title="Published"
                value={stats.publishedPosts}
                icon="🚀"
                trend="up"
                trendValue="+8%"
              />
              <StatCard title="Drafts" value={stats.draftPosts} icon="📋" />
              <StatCard
                title="Total Views"
                value={stats.totalViews.toLocaleString()}
                icon="👁️"
                trend="up"
                trendValue="+25%"
              />
              <StatCard
                title="Total Likes"
                value={stats.totalLikes}
                icon="❤️"
                trend="up"
                trendValue="+15%"
              />
              <StatCard
                title="Avg Views"
                value={stats.avgViews}
                icon="📊"
                trend="up"
                trendValue="+5%"
              />
            </div>

            {/* Recent Posts */}
            <div className="bg-black-100 border border-black-50 rounded-xl p-6">
              <h3 className="text-2xl font-bold mb-6">Recent Posts</h3>
              <div className="space-y-4">
                {posts.slice(0, 3).map((post) => (
                  <div
                    key={post._id}
                    className="flex items-center justify-between p-4 bg-black-200 rounded-lg border border-black-50"
                  >
                    <div className="flex-1">
                      <h4 className="font-semibold text-white">{post.title}</h4>
                      <p className="text-white-50 text-sm">
                        {post.author} •{" "}
                        {new Date(post.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span
                        className={`px-3 py-1 rounded-full text-sm ${
                          post.status === "published"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-yellow-500/20 text-yellow-400"
                        }`}
                      >
                        {post.status}
                      </span>
                      <button
                        onClick={() =>
                          updatePostStatus(
                            post._id,
                            post.status === "published" ? "draft" : "published"
                          )
                        }
                        className="text-sm text-blue-400 hover:text-blue-300"
                      >
                        {post.status === "published" ? "Unpublish" : "Publish"}
                      </button>
                      <span className="text-white-50 text-sm">
                        {post.views} views
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* All Posts Tab */}
        {!loading && activeTab === "posts" && (
          <div className="bg-black-100 border border-black-50 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-black-50 flex justify-between items-center">
              <h3 className="text-2xl font-bold">All Posts</h3>
              <div className="flex gap-2">
                <select
                  onChange={(e) => fetchPosts({ status: e.target.value })}
                  className="bg-black-200 text-white-50 rounded-lg px-3 py-2 border border-black-50"
                >
                  <option value="">All Statuses</option>
                  <option value="published">Published</option>
                  <option value="draft">Drafts</option>
                </select>
                <button
                  onClick={() => fetchPosts()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg"
                >
                  Refresh
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-black-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-white-50">Title</th>
                    <th className="px-6 py-4 text-left text-white-50">
                      Author
                    </th>
                    <th className="px-6 py-4 text-left text-white-50">Date</th>
                    <th className="px-6 py-4 text-left text-white-50">
                      Category
                    </th>
                    <th className="px-6 py-4 text-left text-white-50">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-white-50">Views</th>
                    <th className="px-6 py-4 text-left text-white-50">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map((post) => (
                    <tr
                      key={post._id}
                      className="border-b border-black-50 hover:bg-black-200/50"
                    >
                      <td className="px-6 py-4 text-white font-medium">
                        <a
                          href="#"
                          onClick={() => incrementViews(post._id)}
                          className="hover:text-blue-400 transition-colors"
                        >
                          {post.title}
                        </a>
                      </td>
                      <td className="px-6 py-4 text-white-50">{post.author}</td>
                      <td className="px-6 py-4 text-white-50">
                        {new Date(post.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-white-50">
                        {post.category}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-sm ${
                            post.status === "published"
                              ? "bg-green-500/20 text-green-400"
                              : "bg-yellow-500/20 text-yellow-400"
                          }`}
                        >
                          {post.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-white-50">{post.views}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              updatePostStatus(
                                post._id,
                                post.status === "published"
                                  ? "draft"
                                  : "published"
                              )
                            }
                            className="text-blue-50 hover:text-blue-400 transition-colors"
                          >
                            {post.status === "published"
                              ? "Unpublish"
                              : "Publish"}
                          </button>
                          <button
                            onClick={() => deletePost(post._id)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Create Post Tab */}
        {activeTab === "create" && (
          <div className="max-w-2xl">
            <div className="bg-black-100 border border-black-50 rounded-xl p-8">
              <h3 className="text-2xl font-bold mb-8">Create New Post</h3>
              <form onSubmit={createPost} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-white-50 mb-2 font-medium">
                      Title
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      placeholder="Enter post title"
                      className="w-full px-4 py-4 md:text-base text-sm placeholder:text-blue-50 bg-blue-100 rounded-md border border-black-50 focus:border-white-50 focus:outline-none transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-white-50 mb-2 font-medium">
                      Author
                    </label>
                    <input
                      type="text"
                      name="author"
                      value={formData.author}
                      onChange={handleChange}
                      placeholder="Author name"
                      className="w-full px-4 py-4 md:text-base text-sm placeholder:text-blue-50 bg-blue-100 rounded-md border border-black-50 focus:border-white-50 focus:outline-none transition-colors"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-white-50 mb-2 font-medium">
                    Excerpt
                  </label>
                  <textarea
                    name="excerpt"
                    value={formData.excerpt}
                    onChange={handleChange}
                    placeholder="Brief description of the post"
                    rows={4}
                    className="w-full px-4 py-4 md:text-base text-sm placeholder:text-blue-50 bg-blue-100 rounded-md border border-black-50 focus:border-white-50 focus:outline-none transition-colors resize-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-white-50 mb-2 font-medium">
                      Date
                    </label>
                    <input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleChange}
                      className="w-full px-4 py-4 md:text-base text-sm placeholder:text-blue-50 bg-blue-100 rounded-md border border-black-50 focus:border-white-50 focus:outline-none transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-white-50 mb-2 font-medium">
                      Read Time
                    </label>
                    <input
                      type="text"
                      name="readTime"
                      value={formData.readTime}
                      onChange={handleChange}
                      placeholder="5 min read"
                      className="w-full px-4 py-4 md:text-base text-sm placeholder:text-blue-50 bg-blue-100 rounded-md border border-black-50 focus:border-white-50 focus:outline-none transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-white-50 mb-2 font-medium">
                      Category
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      className="w-full px-4 py-4 md:text-base text-sm placeholder:text-blue-50 bg-blue-100 rounded-md border border-black-50 focus:border-white-50 focus:outline-none transition-colors"
                      required
                    >
                      <option value="">Select category</option>
                      <option value="Technology">Technology</option>
                      <option value="Design">Design</option>
                      <option value="Development">Development</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-white-50 mb-2 font-medium">
                    Image URL
                  </label>
                  <input
                    type="url"
                    name="image"
                    value={formData.image}
                    onChange={handleChange}
                    placeholder="https://example.com/image.jpg"
                    className="w-full px-4 py-4 md:text-base text-sm placeholder:text-blue-50 bg-blue-100 rounded-md border border-black-50 focus:border-white-50 focus:outline-none transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-white-50 mb-2 font-medium">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    name="tags"
                    value={formData.tags}
                    onChange={handleChange}
                    placeholder="React, JavaScript, Web Development"
                    className="w-full px-4 py-4 md:text-base text-sm placeholder:text-blue-50 bg-blue-100 rounded-md border border-black-50 focus:border-white-50 focus:outline-none transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-white-50 mb-2 font-medium">
                    Content
                  </label>
                  <textarea
                    name="content"
                    value={formData.content}
                    onChange={handleChange}
                    placeholder="Write your post content here..."
                    rows={8}
                    className="w-full px-4 py-4 md:text-base text-sm placeholder:text-blue-50 bg-blue-100 rounded-md border border-black-50 focus:border-white-50 focus:outline-none transition-colors resize-none"
                    required
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-white text-black font-semibold py-4 px-6 rounded-lg hover:bg-gray-100 transition-colors duration-300"
                  >
                    Create Post
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, status: "draft" });
                      createPost();
                    }}
                    className="px-6 py-4 bg-black-200 text-white-50 rounded-lg border border-black-50 hover:border-white-50 hover:text-white transition-all duration-300"
                  >
                    Save Draft
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {!loading && activeTab === "analytics" && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Performance Chart */}
              <div className="bg-black-100 border border-black-50 rounded-xl p-6">
                <h3 className="text-xl font-bold mb-6">Performance Overview</h3>
                <div className="h-64 flex items-center justify-center text-white-50">
                  <div className="text-center">
                    <div className="text-4xl mb-2">📊</div>
                    <p>Total Views: {stats.totalViews.toLocaleString()}</p>
                    <p>Total Likes: {stats.totalLikes}</p>
                    <p>Average Views: {stats.avgViews}</p>
                  </div>
                </div>
              </div>

              {/* Top Posts */}
              <div className="bg-black-100 border border-black-50 rounded-xl p-6">
                <h3 className="text-xl font-bold mb-6">Top Performing Posts</h3>
                <div className="space-y-4">
                  {posts
                    .filter((post) => post.status === "published")
                    .sort((a, b) => b.views - a.views)
                    .slice(0, 5)
                    .map((post, index) => (
                      <div
                        key={post._id}
                        className="flex items-center justify-between p-3 bg-black-200 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-white-50 text-sm">
                            #{index + 1}
                          </span>
                          <div>
                            <h4 className="font-medium text-white text-sm">
                              {post.title}
                            </h4>
                            <p className="text-white-50 text-xs">
                              {post.category}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-white font-medium">
                            {post.views}
                          </div>
                          <div className="text-white-50 text-xs">views</div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Category Performance */}
            <div className="bg-black-100 border border-black-50 rounded-xl p-6">
              <h3 className="text-xl font-bold mb-6">Category Performance</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {categoryAnalytics.map((category) => (
                  <div
                    key={category._id}
                    className="bg-black-200 rounded-lg p-4"
                  >
                    <h4 className="font-semibold text-white mb-2">
                      {category._id}
                    </h4>
                    <div className="text-2xl font-bold text-white mb-1">
                      {category.totalViews}
                    </div>
                    <div className="text-white-50 text-sm">
                      {category.count} posts
                    </div>
                    <div className="text-white-50 text-sm mt-2">
                      Likes: {category.totalLikes}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default BlogManagement;
