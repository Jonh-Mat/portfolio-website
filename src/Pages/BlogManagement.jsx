import { useState, useEffect } from "react";
import axios from "axios";
import MDEditor from "@uiw/react-md-editor";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";
import { useAuth } from "../context/AuthContext";
import { Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
} from "chart.js";
import TitleHeader from "../components/TitleHeader";
import CountUp from "react-countup";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement
);

const BlogManagement = () => {
  const { user, isAdmin, isAuthenticated, getAuthToken, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [stats, setStats] = useState({
    totalPosts: 0,
    publishedPosts: 0,
    draftPosts: 0,
    totalViews: 0,
    totalLikes: 0,
    avgViews: 0,
  });
  const [categoryAnalytics, setCategoryAnalytics] = useState([]);
  const [monthlyStats, setMonthlyStats] = useState([]);
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

  // Configure axios interceptor for auth
  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }

    // Response interceptor to handle auth errors
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          logout();
          setError("Session expired. Please log in again.");
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [getAuthToken, logout]);

  // Check authentication on component mount
  useEffect(() => {
    if (!isAuthenticated()) {
      setError("Please log in to access the blog management system.");
      setLoading(false);
      return;
    }

    // Clear error if user is authenticated
    setError(null);
  }, [isAuthenticated]);

  // Fetch posts from backend
  const fetchPosts = async (params = {}) => {
    if (!isAuthenticated()) return;

    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/posts`, { params });
      setPosts(response.data);
      setError(null);
    } catch (err) {
      console.error("Error fetching posts:", err);
      if (err.response?.status === 403) {
        setError("You don't have permission to view posts.");
      } else {
        setError("Failed to fetch posts");
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch analytics data (admin only)
  const fetchAnalytics = async () => {
    if (!isAdmin()) {
      setError("Admin access required to view analytics.");
      return;
    }

    try {
      const [statsRes, categoriesRes, monthlyRes] = await Promise.all([
        axios.get(`${API_URL}/analytics/stats`),
        axios.get(`${API_URL}/analytics/categories`),
        axios.get(`${API_URL}/analytics/monthly`),
      ]);

      setStats(statsRes.data);
      setCategoryAnalytics(categoriesRes.data);
      setMonthlyStats(monthlyRes.data);
      setError(null);
    } catch (err) {
      console.error("Error fetching analytics:", err);
      if (err.response?.status === 403) {
        setError("Admin access required to view analytics.");
      } else {
        setError("Failed to fetch analytics");
      }
    }
  };

  // Create new post (admin only)
  const createPost = async (e) => {
    e.preventDefault();

    if (!isAdmin()) {
      setError("Admin access required to create posts.");
      return;
    }

    if (!formData.title || !formData.content || !formData.author) {
      setError("Please fill in all required fields.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const postData = {
        ...formData,
        status: "published",
        tags: formData.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag),
        date: new Date(formData.date || Date.now()),
      };

      const response = await axios.post(`${API_URL}/posts`, postData);
      setPosts([response.data, ...posts]);
      setActiveTab("posts");
      resetForm();
      setError(null);
    } catch (err) {
      console.error("Error creating post:", err);
      if (err.response?.status === 403) {
        setError("Admin access required to create posts.");
      } else {
        setError(err.response?.data?.error || "Failed to create post");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Save as draft (admin only)
  const saveDraft = async (e) => {
    e.preventDefault();

    if (!isAdmin()) {
      setError("Admin access required to save drafts.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const postData = {
        ...formData,
        status: "draft",
        tags: formData.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag),
        date: new Date(formData.date || Date.now()),
      };

      const response = await axios.post(`${API_URL}/posts`, postData);
      setPosts([response.data, ...posts]);
      resetForm();
      setError(null);
    } catch (err) {
      console.error("Error saving draft:", err);
      if (err.response?.status === 403) {
        setError("Admin access required to save drafts.");
      } else {
        setError(err.response?.data?.error || "Failed to save draft");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5MB");
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file");
      return;
    }

    const data = new FormData();
    data.append("file", file);
    data.append("upload_preset", "blog_unsigned");

    setUploadingImage(true);
    setError(null);

    try {
      const res = await fetch(
        "https://api.cloudinary.com/v1_1/dpjqo69v4/image/upload",
        {
          method: "POST",
          body: data,
        }
      );

      if (!res.ok) {
        throw new Error("Upload failed");
      }

      const result = await res.json();
      setFormData((prev) => ({ ...prev, image: result.secure_url }));
    } catch (err) {
      console.error("Image upload failed:", err);
      setError("Failed to upload image. Please try again.");
    } finally {
      setUploadingImage(false);
    }
  };

  // Update post status (admin only)
  const updatePostStatus = async (id, status) => {
    if (!isAdmin()) {
      setError("Admin access required to update post status.");
      return;
    }

    try {
      await axios.patch(`${API_URL}/posts/${id}/status`, { status });
      // Update local state
      setPosts(
        posts.map((post) => (post._id === id ? { ...post, status } : post))
      );
      setError(null);
    } catch (err) {
      console.error("Error updating status:", err);
      if (err.response?.status === 403) {
        setError("Admin access required to update post status.");
      } else {
        setError("Failed to update status");
      }
    }
  };

  // Delete post (admin only)
  const deletePost = async (id) => {
    if (!isAdmin()) {
      setError("Admin access required to delete posts.");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this post?")) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/posts/${id}`);
      setPosts(posts.filter((post) => post._id !== id));
      setError(null);
    } catch (err) {
      console.error("Error deleting post:", err);
      if (err.response?.status === 403) {
        setError("Admin access required to delete posts.");
      } else {
        setError("Failed to delete post");
      }
    }
  };

  // Increment views (all authenticated users)
  const incrementViews = async (id) => {
    if (!isAuthenticated()) return;

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
      author: user?.username || "",
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

  // Set default author when user changes
  useEffect(() => {
    if (user && !formData.author) {
      setFormData((prev) => ({ ...prev, author: user.username }));
    }
  }, [user, formData.author]);

  // Fetch data on component mount and tab changes
  useEffect(() => {
    if (!isAuthenticated()) return;

    if (activeTab === "posts" || activeTab === "dashboard") {
      fetchPosts({ status: "published" });
    }

    if ((activeTab === "dashboard" || activeTab === "analytics") && isAdmin()) {
      fetchAnalytics();
    } else if (activeTab === "analytics" && !isAdmin()) {
      setError("Admin access required to view analytics.");
    }
  }, [activeTab, isAuthenticated, isAdmin]);

  // Handle tab switching with permission checks
  const handleTabChange = (tabId) => {
    if (!isAuthenticated()) {
      setError("Please log in to access this feature.");
      return;
    }

    if ((tabId === "create" || tabId === "analytics") && !isAdmin()) {
      setError("Admin access required for this feature.");
      return;
    }

    setError(null);
    setActiveTab(tabId);
  };

  // Authentication check rendering
  if (!isAuthenticated()) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Authentication Required</h1>
          <p className="text-white-50 mb-8">
            Please log in to access the blog management system.
          </p>
          <button
            onClick={() => (window.location.href = "/login")}
            className="bg-white text-black px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // StatCard Component
  const StatCard = ({ title, value, icon, trend, trendValue }) => (
    <div className="bg-black-100 border border-black-50 rounded-xl p-6 hover:border-white-50 transition-all duration-300 group">
      <div className="flex items-center justify-between mb-4">
        <div className="text-white-50 text-sm font-medium">{title}</div>
        <div className="text-blue-50 text-2xl">{icon}</div>
      </div>
      <div className="text-3xl font-bold text-white mb-2">
        <CountUp end={value} />
      </div>
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
  const TabButton = ({ id, label, active, onClick, disabled = false }) => (
    <button
      onClick={() => !disabled && onClick(id)}
      disabled={disabled}
      className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
        disabled
          ? "bg-black-200 text-white-50 opacity-50 cursor-not-allowed"
          : active
          ? "bg-white text-black"
          : "bg-black-200 text-white-50 hover:text-white border border-black-50 hover:border-white-50"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-[1000px] bg-black text-white">
      <section className="section-padding">
        {/* Header */}
        <div className="mb-12">
          <TitleHeader
            title="Blog Management"
            sub={isAdmin() ? "Admin Dashboard" : "Manage your blog experience"}
          />
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-4 mb-12">
          {[
            { id: "dashboard", label: "Dashboard" },
            { id: "posts", label: "All Posts" },
            { id: "create", label: "Create Post", admin: true },
            { id: "analytics", label: "Analytics", admin: true },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() =>
                !tab.admin || isAdmin() ? handleTabChange(tab.id) : null
              }
              disabled={tab.admin && !isAdmin()}
              className={`px-6 py-3 rounded-full font-medium transition-all duration-300 shadow-sm border border-black-50 focus:outline-none focus:ring-2 focus:ring-blue-400/50
                ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-blue-100 to-black-50 text-white shadow-lg"
                    : "bg-black-200 text-white-50 hover:text-white hover:bg-black-50"
                }
                ${
                  tab.admin && !isAdmin() ? "opacity-50 cursor-not-allowed" : ""
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 text-red-400 rounded-lg border border-red-500/30">
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
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
            {isAdmin() && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {/* Use GloCard for each stat */}
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
            )}

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
                      {isAdmin() && (
                        <button
                          onClick={() =>
                            updatePostStatus(
                              post._id,
                              post.status === "published"
                                ? "draft"
                                : "published"
                            )
                          }
                          className="text-sm text-blue-400 hover:text-blue-300"
                        >
                          {post.status === "published"
                            ? "Unpublish"
                            : "Publish"}
                        </button>
                      )}
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
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
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
                    {isAdmin() && (
                      <th className="px-6 py-4 text-left text-white-50">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {posts.map((post) => (
                    <tr
                      key={post._id}
                      className={`border-b border-black-50 hover:bg-black-200/50`}
                    >
                      <td className="px-6 py-4 text-white font-medium">
                        <button
                          onClick={() => incrementViews(post._id)}
                          className="text-left hover:text-blue-400 transition-colors"
                        >
                          {post.title}
                        </button>
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
                      {isAdmin() && (
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
                              className="text-blue-50 hover:text-blue-400 transition-colors text-sm"
                            >
                              {post.status === "published"
                                ? "Unpublish"
                                : "Publish"}
                            </button>
                            <button
                              onClick={() => deletePost(post._id)}
                              className="text-red-400 hover:text-red-300 transition-colors text-sm"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Create Post Tab - Admin Only */}
        {activeTab === "create" && isAdmin() && (
          <div className="max-w-2xl">
            <div className="bg-black-100 border border-black-50 rounded-xl p-8">
              <h3 className="text-2xl font-bold mb-8">Create New Post</h3>
              <form onSubmit={createPost} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-white-50 mb-2 font-medium">
                      Title *
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
                      Author *
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
                    Excerpt *
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
                      Category *
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
                    Upload Image
                  </label>

                  <div className="relative">
                    <input
                      id="fileUpload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="sr-only"
                      disabled={uploadingImage}
                    />
                    <label
                      htmlFor="fileUpload"
                      className={`inline-block px-4 py-3 bg-blue-100 text-white rounded-md cursor-pointer hover:bg-blue-50 transition ${
                        uploadingImage ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      {formData.image ? "Change Image" : "Select Image"}
                    </label>
                    {uploadingImage && (
                      <span className="ml-4 text-blue-400 text-sm">
                        Uploading...
                      </span>
                    )}
                  </div>

                  {formData.image && !uploadingImage && (
                    <div className="relative">
                      <img
                        src={formData.image}
                        alt="Preview"
                        className="w-full max-h-64 object-cover rounded-md border border-black-50"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity duration-300 rounded-md">
                        <span className="text-white text-sm">
                          Change or remove image
                        </span>
                      </div>
                    </div>
                  )}
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
                  <MDEditor
                    value={formData.content}
                    onChange={(val) =>
                      setFormData({ ...formData, content: val || "" })
                    }
                    preview="edit" // Options: 'edit', 'preview', 'live'
                    height={400}
                    data-color-mode="dark"
                    hideToolbar={false}
                    visibleDragBar={false}
                    textareaProps={{
                      placeholder: "Write your blog post content here...",
                      style: {
                        fontSize: 16,
                        lineHeight: 1.6,
                        fontFamily:
                          'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                      },
                    }}
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
                <div className="flex items-center gap-6 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-50/20">
                      <svg
                        className="w-4 h-4 text-blue-50"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    </span>
                    <span className="text-blue-50 font-medium">Views</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-pink-400/20">
                      <svg
                        className="w-4 h-4 text-pink-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 21.364l-7.682-7.682a4.5 4.5 0 010-6.364z"
                        />
                      </svg>
                    </span>
                    <span className="text-pink-400 font-medium">Likes</span>
                  </div>
                </div>
                <div className="h-64 flex items-center justify-center text-white-50">
                  <Line
                    data={{
                      labels: monthlyStats.map((m) => m._id),
                      datasets: [
                        {
                          label: "Total Views",
                          data: monthlyStats.map((m) => m.views),
                          borderColor: "#839cb5",
                          backgroundColor: "rgba(98,224,255,0.2)",
                          pointBackgroundColor: "#839cb5",
                          pointBorderColor: "#839cb5",
                          tension: 0.4,
                        },
                        {
                          label: "Total Likes",
                          data: monthlyStats.map((m) => m.likes),
                          borderColor: "#fd5c79",
                          backgroundColor: "rgba(253,92,121,0.2)",
                          pointBackgroundColor: "#fd5c79",
                          pointBorderColor: "#fd5c79",
                          tension: 0.4,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: { display: false },
                        title: { display: false },
                      },
                      scales: {
                        x: {
                          ticks: { color: "#d9ecff" },
                          grid: { color: "#282732" },
                        },
                        y: {
                          ticks: { color: "#d9ecff" },
                          grid: { color: "#282732" },
                        },
                      },
                    }}
                  />
                </div>
              </div>

              {/* Category Bar+Line Chart with custom legend */}
              <div className="bg-black-100 border border-black-50 rounded-xl p-6">
                <h3 className="text-xl font-bold mb-6">Category Performance</h3>
                <div className="h-64 flex items-center justify-center text-white-50">
                  <Bar
                    data={{
                      labels: categoryAnalytics.map((cat) => cat._id),
                      datasets: [
                        {
                          type: "bar",
                          label: "Views",
                          data: categoryAnalytics.map((cat) => cat.totalViews),
                          backgroundColor: "#839cb5", // --color-blue-50
                          borderRadius: 8,
                          barPercentage: 0.6,
                          categoryPercentage: 0.6,
                        },
                        {
                          type: "line",
                          label: "Likes",
                          data: categoryAnalytics.map((cat) => cat.totalLikes),
                          borderColor: "#fd5c79",
                          backgroundColor: "rgba(253,92,121,0.2)",
                          borderWidth: 3,
                          pointBackgroundColor: "#fd5c79",
                          pointBorderColor: "#fd5c79",
                          fill: false,
                          tension: 0.4,
                          yAxisID: "y",
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: { display: false },
                        title: { display: false },
                      },
                      scales: {
                        x: {
                          ticks: { color: "#d9ecff" },
                          grid: { color: "#282732" },
                        },
                        y: {
                          ticks: { color: "#d9ecff" },
                          grid: { color: "#282732" },
                        },
                      },
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default BlogManagement;
