import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const categories = ["all", "Technology", "Design", "Development"];

const Blog = () => {
  const [posts, setPosts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [hoveredCard, setHoveredCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { getAuthToken } = useAuth();

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        const token = getAuthToken();

        if (!token) {
          setError("No authentication token found");
          setPosts([]);
          return;
        }

        const res = await fetch(
          "http://localhost:5000/api/posts?status=published",
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();

        // Ensure data is an array
        if (Array.isArray(data)) {
          setPosts(data);
        } else {
          console.error("Expected array but received:", data);
          setPosts([]);
          setError("Invalid data format received from server");
        }
      } catch (err) {
        console.error("Failed to fetch posts", err);
        setError("Failed to load posts. Please try again later.");
        setPosts([]); // Ensure posts is always an array
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, [getAuthToken]);

  // Ensure filteredPosts is always an array
  const filteredPosts = Array.isArray(posts)
    ? selectedCategory === "all"
      ? posts
      : posts.filter((post) => post.category === selectedCategory)
    : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mb-4"></div>
          <p className="text-white-50">Loading posts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-200 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <section className="section-padding">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white via-blue-50 to-white bg-clip-text text-transparent">
            Blog
          </h1>
          <p className="text-white-50 text-lg md:text-xl max-w-2xl mx-auto">
            Insights, thoughts, and stories from the world of technology and
            design
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-4 mb-16">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`group relative px-6 py-3 rounded-lg font-medium transition-all duration-300 overflow-hidden ${
                selectedCategory === category
                  ? "bg-white text-black"
                  : "bg-black-200 text-white-50 hover:text-white border border-black-50"
              }`}
            >
              {selectedCategory !== category && (
                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
              )}
              <span className="relative z-10 capitalize">{category}</span>
            </button>
          ))}
        </div>

        {filteredPosts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-white-50 text-lg">
              No posts available at the moment.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {filteredPosts.map((post) => (
              <article
                key={post._id}
                className="group relative bg-black-100 rounded-xl overflow-hidden border border-black-50 transition-all duration-500 hover:border-white-50 hover:shadow-2xl hover:shadow-blue-100/20"
                onMouseEnter={() => setHoveredCard(post._id)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 -translate-x-full group-hover:translate-x-full transform"></div>

                <div className="relative overflow-hidden">
                  <img
                    src={post.image}
                    alt={post.title}
                    className="w-full h-48 md:h-56 object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black-100/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="absolute top-4 left-4">
                    <span className="bg-black-200/90 backdrop-blur-sm text-white-50 px-3 py-1 rounded-full text-sm font-medium border border-black-50">
                      {post.category}
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  <h2 className="text-xl md:text-2xl font-semibold mb-3 text-white group-hover:text-blue-50 transition-colors duration-300 line-clamp-2">
                    {post.title}
                  </h2>

                  <div className="flex items-center gap-2 text-sm text-white-50 mb-4">
                    <span>{post.author}</span>
                    <span className="w-1 h-1 bg-white-50 rounded-full"></span>
                    <span>{new Date(post.date).toLocaleDateString()}</span>
                    <span className="w-1 h-1 bg-white-50 rounded-full"></span>
                    <span>{post.readTime}</span>
                  </div>

                  <p className="text-white-50 mb-6 line-clamp-3">
                    {post.excerpt}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-6">
                    {post.tags &&
                      post.tags.map((tag) => (
                        <span
                          key={tag}
                          className="bg-black-200 text-white-50 px-3 py-1 rounded-full text-sm hover:bg-black-50 transition-colors duration-300"
                        >
                          {tag}
                        </span>
                      ))}
                  </div>

                  <div className="flex justify-between items-center">
                    <Link
                      to={`/blog/${post._id}`}
                      className="group/btn flex items-center gap-2 text-white-50 hover:text-white transition-colors duration-300"
                    >
                      <span>Read More</span>
                      <svg
                        className="w-4 h-4 transition-transform duration-300 group-hover/btn:translate-x-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </Link>

                    <button className="text-white-50 hover:text-white transition-colors duration-300">
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
                          d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                {hoveredCard === post._id && (
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 opacity-20 pointer-events-none"></div>
                )}
              </article>
            ))}
          </div>
        )}

        <div className="text-center mt-16">
          <button className="group relative px-8 py-4 bg-black-200 text-white rounded-lg border border-black-50 hover:border-white-50 transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
            <span className="relative z-10 font-medium">
              Load More Articles
            </span>
          </button>
        </div>
      </section>
    </div>
  );
};

export default Blog;
