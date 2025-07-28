import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import MarkdownPreview from "@uiw/react-markdown-preview";
import { useAuth } from "../context/AuthContext";

const BlogPost = () => {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [replyContent, setReplyContent] = useState("");
  const [commentsPage, setCommentsPage] = useState(1);
  const [commentsPagination, setCommentsPagination] = useState(null);
  const { getAuthToken, user } = useAuth();
  const API_URL = "http://localhost:5000/api";
  const viewTracked = useRef(false);

  // Fetch post data
  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = getAuthToken();
        const headers = {
          "Content-Type": "application/json",
        };

        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const res = await fetch(`${API_URL}/posts/${id}`, { headers });

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();
        setPost(data);
      } catch (err) {
        console.error("Failed to fetch post:", err);
        setError("Failed to load post. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchPost();
    }
  }, [id, getAuthToken]);

  // Track view when post loads
  useEffect(() => {
    const trackView = async () => {
      if (post && !viewTracked.current && getAuthToken()) {
        try {
          const token = getAuthToken();
          const res = await fetch(`${API_URL}/posts/${id}/view`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          });

          if (res.ok) {
            const updatedPost = await res.json();
            setPost(updatedPost);
            viewTracked.current = true;
          }
        } catch (err) {
          console.error("Failed to track view:", err);
        }
      }
    };

    trackView();
  }, [post, id, getAuthToken]);

  // Fetch comments
  useEffect(() => {
    const fetchComments = async () => {
      if (!id) return;

      try {
        setCommentsLoading(true);
        const token = getAuthToken();
        const headers = {
          "Content-Type": "application/json",
        };

        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const res = await fetch(
          `${API_URL}/posts/${id}/comments?page=${commentsPage}&limit=10`,
          { headers }
        );

        if (res.ok) {
          const data = await res.json();
          if (commentsPage === 1) {
            setComments(data.comments);
          } else {
            setComments((prev) => [...prev, ...data.comments]);
          }
          setCommentsPagination(data.pagination);
        }
      } catch (err) {
        console.error("Failed to fetch comments:", err);
      } finally {
        setCommentsLoading(false);
      }
    };

    fetchComments();
  }, [id, commentsPage, getAuthToken]);

  // Handle like toggle
  const handleLike = async () => {
    if (!getAuthToken()) return;

    try {
      const token = getAuthToken();
      const res = await fetch(`${API_URL}/posts/${id}/like`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const updatedPost = await res.json();
        setPost(updatedPost);
      }
    } catch (err) {
      console.error("Failed to toggle like:", err);
    }
  };

  // Handle comment submission
  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !getAuthToken()) return;

    try {
      const token = getAuthToken();
      const res = await fetch(`${API_URL}/posts/${id}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: newComment }),
      });

      if (res.ok) {
        const comment = await res.json();
        setComments((prev) => [
          { ...comment, replies: [], repliesCount: 0 },
          ...prev,
        ]);
        setNewComment("");
        // Update post comment count
        setPost((prev) => ({ ...prev, commentsCount: prev.commentsCount + 1 }));
      }
    } catch (err) {
      console.error("Failed to submit comment:", err);
    }
  };

  // Handle reply submission
  const handleReplySubmit = async (e, parentCommentId) => {
    e.preventDefault();
    if (!replyContent.trim() || !getAuthToken()) return;

    try {
      const token = getAuthToken();
      const res = await fetch(`${API_URL}/posts/${id}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: replyContent,
          parentComment: parentCommentId,
        }),
      });

      if (res.ok) {
        const reply = await res.json();
        setComments((prev) =>
          prev.map((comment) =>
            comment._id === parentCommentId
              ? {
                  ...comment,
                  replies: [...comment.replies, reply],
                  repliesCount: comment.repliesCount + 1,
                }
              : comment
          )
        );
        setReplyContent("");
        setReplyTo(null);
      }
    } catch (err) {
      console.error("Failed to submit reply:", err);
    }
  };

  // Handle comment like
  const handleCommentLike = async (commentId) => {
    if (!getAuthToken()) return;

    try {
      const token = getAuthToken();
      const res = await fetch(`${API_URL}/comments/${commentId}/like`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const updatedComment = await res.json();
        setComments((prev) =>
          prev.map((comment) => {
            if (comment._id === commentId) {
              return updatedComment;
            }
            // Check if it's a reply
            if (comment.replies.some((reply) => reply._id === commentId)) {
              return {
                ...comment,
                replies: comment.replies.map((reply) =>
                  reply._id === commentId ? updatedComment : reply
                ),
              };
            }
            return comment;
          })
        );
      }
    } catch (err) {
      console.error("Failed to toggle comment like:", err);
    }
  };

  // Load more comments
  const loadMoreComments = () => {
    if (commentsPagination && commentsPagination.hasMore) {
      setCommentsPage((prev) => prev + 1);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else if (diffInMinutes < 10080) {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-black-50 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-t-white-50 rounded-full animate-spin"></div>
          </div>
          <p className="text-white-50 text-lg">Loading post...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center padding-x">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-8 rounded-full bg-red-600/20 flex items-center justify-center">
            <svg
              className="w-10 h-10 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-4 text-white">
            Something went wrong
          </h2>
          <p className="text-red-400 mb-8">{error}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-white text-black rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Try Again
            </button>
            <Link
              to="/blog"
              className="px-6 py-3 card-border text-white rounded-lg hover:border-white-50 transition-colors font-medium text-center"
            >
              Back to Blog
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center padding-x">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-8 rounded-full bg-black-100 flex items-center justify-center border border-black-50">
            <svg
              className="w-10 h-10 text-white-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.49 1.006-5.971 2.672M12 9V7.5a2.5 2.5 0 00-5 0v.5"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-4 text-white">Post not found</h2>
          <p className="text-white-50 mb-8">
            The requested blog post could not be found.
          </p>
          <Link
            to="/blog"
            className="px-6 py-3 bg-white text-black rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <section className="relative py-16 md:py-24">
        <div className="max-w-7xl mx-auto padding-x">
          {/* Category badge */}
          {post.category && (
            <div className="mb-6">
              <span className="hero-badge">{post.category}</span>
            </div>
          )}

          {/* Title */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-8 leading-tight max-w-5xl">
            {post.title}
          </h1>

          {/* Meta information */}
          <div className="flex flex-wrap items-center gap-6 text-white-50 mb-8">
            {post.author && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {post.author.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="font-medium">{post.author}</span>
              </div>
            )}

            {post.date && (
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <time dateTime={post.date}>
                  {new Date(post.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </time>
              </div>
            )}

            {post.readTime && (
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{post.readTime}</span>
              </div>
            )}
          </div>

          {/* Excerpt */}
          {post.excerpt && (
            <div className="text-xl md:text-2xl text-white-50 leading-relaxed mb-8 max-w-4xl">
              {post.excerpt}
            </div>
          )}
        </div>
      </section>

      {/* Hero Image */}
      <section className="padding-x mb-16">
        <div className="max-w-7xl mx-auto">
          <div className="relative rounded-2xl overflow-hidden border border-black-50 bg-black-100">
            <img
              src={post.image}
              alt={post.title}
              className="w-full h-64 md:h-80 lg:h-96 xl:h-[60vh] object-cover"
              onError={(e) => {
                e.target.src =
                  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSIzMDAiIGZpbGw9IiMxMTE4MjciLz48cGF0aCBkPSJNMTc1IDEyNUwyMjUgMTc1SDE3NVYxMjVaIiBmaWxsPSIjMzc0MTUxIi8+PHBhdGggZD0iTTE1MCAyMDBIMjUwVjE1MEgxNTBWMjAwWiIgZmlsbD0iIzM3NDE1MSIvPjx0ZXh0IHg9IjIwMCIgeT0iMjMwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNjM3Mzg0IiBmb250LXNpemU9IjE0Ij5JbWFnZSBub3QgZm91bmQ8L3RleHQ+PC9zdmc+";
              }}
            />
            {/* Gradient overlay for better text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
          </div>
        </div>
      </section>

      {/* Post Stats and Tags */}
      <section className="padding-x mb-16">
        <div className="max-w-4xl mx-auto">
          {/* Stats bar */}
          <div className="card-border rounded-2xl p-6 mb-8">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-3 text-white-50">
                  <div className="w-10 h-10 rounded-full bg-black-200 flex items-center justify-center">
                    <svg
                      className="w-5 h-5"
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
                  </div>
                  <span className="font-medium">{post.views || 0} views</span>
                </div>

                <div className="flex items-center gap-3 text-white-50">
                  <div className="w-10 h-10 rounded-full bg-black-200 flex items-center justify-center">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                  </div>
                  <span className="font-medium">
                    {post.commentsCount || 0} comments
                  </span>
                </div>
              </div>

              <button
                onClick={handleLike}
                className={`group flex items-center gap-3 px-4 py-2 rounded-full transition-all duration-300 ${
                  post.userHasLiked
                    ? "bg-red-600 text-white"
                    : "bg-black-200 text-white-50 hover:bg-red-600 hover:text-white"
                }`}
              >
                <svg
                  className="w-5 h-5 transition-transform duration-300 group-hover:scale-110"
                  fill={post.userHasLiked ? "currentColor" : "none"}
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
                <span className="font-medium">{post.likes || 0}</span>
              </button>
            </div>
          </div>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-12">
              {post.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-4 py-2 card-border rounded-full text-sm text-white-50 hover:border-white-50 hover:text-white transition-colors duration-300 cursor-pointer"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Main Content */}
      <article className="padding-x mb-20">
        <div className="max-w-4xl mx-auto">
          <div className="prose prose-invert prose-lg max-w-none">
            {post.content ? (
              <MarkdownPreview
                source={post.content}
                style={{
                  backgroundColor: "transparent",
                  color: "#e5e7eb",
                  fontSize: "1.125rem",
                  lineHeight: "1.75",
                }}
                data-color-mode="dark"
              />
            ) : (
              <div className="card-border rounded-2xl p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-black-200 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-white-50"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.49 1.006-5.971 2.672M12 9V7.5a2.5 2.5 0 00-5 0v.5"
                    />
                  </svg>
                </div>
                <p className="text-white-50 text-lg">
                  No content available for this post.
                </p>
              </div>
            )}
          </div>
        </div>
      </article>

      {/* Comments Section */}
      <section className="padding-x mb-20">
        <div className="max-w-4xl mx-auto">
          <div className="card-border rounded-2xl p-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl md:text-3xl font-bold">
                Comments ({post.commentsCount || 0})
              </h2>
              <div className="w-12 h-12 rounded-full bg-black-200 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white-50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
            </div>

            {/* Comment Form */}
            {user ? (
              <form onSubmit={handleCommentSubmit} className="mb-12">
                <div className="mb-6">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Share your thoughts..."
                    className="w-full p-6 card-border rounded-xl text-white placeholder-white-50 focus:outline-none focus:border-white-50 resize-none transition-colors duration-300"
                    rows="4"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={!newComment.trim()}
                    className="px-8 py-3 bg-white text-black rounded-xl hover:bg-black-200 hover:text-white transition-all duration-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-black-200 disabled:text-white-50"
                  >
                    Post Comment
                  </button>
                </div>
              </form>
            ) : (
              <div className="card-border rounded-xl p-6 mb-8 text-center">
                <p className="text-white-50 mb-4">
                  Please log in to leave a comment.
                </p>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                    />
                  </svg>
                  Log in to comment
                </Link>
              </div>
            )}

            {/* Comments List */}
            <div className="space-y-8">
              {comments.map((comment) => (
                <div key={comment._id} className="group">
                  <div className="card-border rounded-xl p-6 hover:border-white-50 transition-colors duration-300">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-semibold text-sm">
                          {comment.author.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-semibold text-white">
                            {comment.author.username}
                          </span>
                          <span className="text-white-50 text-sm">
                            {formatDate(comment.createdAt)}
                          </span>
                        </div>
                        <p className="text-white-50 leading-relaxed break-words">
                          {comment.content}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 ml-14">
                      <button
                        onClick={() => handleCommentLike(comment._id)}
                        className={`group/like flex items-center gap-2 text-sm transition-all duration-300 ${
                          comment.userHasLiked
                            ? "text-red-400"
                            : "text-white-50 hover:text-red-400"
                        }`}
                      >
                        <svg
                          className={`w-4 h-4 transition-all duration-300 ${
                            comment.userHasLiked
                              ? "scale-110"
                              : "group-hover/like:scale-110"
                          }`}
                          fill={comment.userHasLiked ? "currentColor" : "none"}
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                          />
                        </svg>
                        <span>{comment.likes || 0}</span>
                      </button>

                      {user && (
                        <button
                          onClick={() =>
                            setReplyTo(
                              replyTo === comment._id ? null : comment._id
                            )
                          }
                          className="text-sm text-white-50 hover:text-white transition-colors duration-300 font-medium"
                        >
                          Reply
                        </button>
                      )}
                    </div>

                    {/* Reply Form */}
                    {replyTo === comment._id && (
                      <div className="mt-6 ml-14 animate-in slide-in-from-top-2 duration-200">
                        <form
                          onSubmit={(e) => handleReplySubmit(e, comment._id)}
                          className="space-y-4"
                        >
                          <div>
                            <textarea
                              value={replyContent}
                              onChange={(e) => setReplyContent(e.target.value)}
                              placeholder="Write a thoughtful reply..."
                              className="w-full p-4 bg-black-200 border border-black-50 rounded-lg text-white placeholder-white-50 focus:outline-none focus:border-blue-50 transition-colors duration-300 resize-none"
                              rows="3"
                            />
                          </div>
                          <div className="flex gap-3 justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                setReplyTo(null);
                                setReplyContent("");
                              }}
                              className="px-4 py-2 bg-black-200 text-white-50 rounded-lg hover:bg-black-50 transition-colors duration-300 text-sm font-medium"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={!replyContent.trim()}
                              className="px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-200 transition-all duration-300 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
                            >
                              Post Reply
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    {/* Replies */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="mt-6 ml-14 space-y-4">
                        {comment.replies.map((reply) => (
                          <div
                            key={reply._id}
                            className="card-border rounded-lg p-4 bg-black-200/50 backdrop-blur-sm"
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                                <span className="text-white font-semibold text-xs">
                                  {reply.author.username
                                    .charAt(0)
                                    .toUpperCase()}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="font-semibold text-white text-sm">
                                    {reply.author.username}
                                  </span>
                                  <span className="text-white-50 text-xs">
                                    {formatDate(reply.createdAt)}
                                  </span>
                                </div>
                                <p className="text-white-50 text-sm leading-relaxed break-words mb-3">
                                  {reply.content}
                                </p>
                                <button
                                  onClick={() => handleCommentLike(reply._id)}
                                  className={`group/reply-like flex items-center gap-1 text-xs transition-all duration-300 ${
                                    reply.userHasLiked
                                      ? "text-red-400"
                                      : "text-white-50 hover:text-red-400"
                                  }`}
                                >
                                  <svg
                                    className={`w-3 h-3 transition-all duration-300 ${
                                      reply.userHasLiked
                                        ? "scale-110"
                                        : "group-hover/reply-like:scale-110"
                                    }`}
                                    fill={
                                      reply.userHasLiked
                                        ? "currentColor"
                                        : "none"
                                    }
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                                    />
                                  </svg>
                                  <span>{reply.likes || 0}</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Load More Comments */}
              {commentsPagination && commentsPagination.hasMore && (
                <div className="text-center">
                  <button
                    onClick={loadMoreComments}
                    disabled={commentsLoading}
                    className="px-8 py-3 bg-black-200 text-white border border-black-50 rounded-xl hover:border-blue-50 transition-all duration-300 font-medium disabled:opacity-50 transform hover:scale-105 active:scale-95"
                  >
                    {commentsLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white-50 border-t-transparent rounded-full animate-spin"></div>
                        Loading...
                      </div>
                    ) : (
                      "Load More Comments"
                    )}
                  </button>
                </div>
              )}

              {/* Empty State */}
              {comments.length === 0 && !commentsLoading && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-black-200 flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-white-50"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                  </div>
                  <p className="text-white-50 text-lg mb-2">No comments yet</p>
                  <p className="text-white-50 text-sm">
                    Be the first to share your thoughts!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Back to Blog Navigation */}
      <div className="mt-16 pt-8 border-t border-black-50">
        <Link
          to="/blog"
          className="group inline-flex items-center gap-3 text-white-50 hover:text-white transition-all duration-300 font-medium"
        >
          <div className="p-2 rounded-full bg-black-200 border border-black-50 group-hover:border-white-50 group-hover:bg-black-50 transition-all duration-300">
            <svg
              className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </div>
          <span>Back to Blog</span>
        </Link>
      </div>
    </div>
  );
};

export default BlogPost;
