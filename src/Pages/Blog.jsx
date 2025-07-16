import { useState } from "react";
import { blogPosts, categories } from "../constants";

const Blog = () => {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [hoveredCard, setHoveredCard] = useState(null);

  const filteredPosts =
    selectedCategory === "all"
      ? blogPosts
      : blogPosts.filter((post) => post.category === selectedCategory);

  return (
    <div className="min-h-screen bg-black text-white">
      <section className="section-padding">
        {/* Header with gradient text effect */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white via-blue-50 to-white bg-clip-text text-transparent">
            Blog
          </h1>
          <p className="text-white-50 text-lg md:text-xl max-w-2xl mx-auto">
            Insights, thoughts, and stories from the world of technology and
            design
          </p>
        </div>

        {/* Enhanced Category Filter */}
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

        {/* Enhanced Blog Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {filteredPosts.map((post) => (
            <article
              key={post.id}
              className="group relative bg-black-100 rounded-xl overflow-hidden border border-black-50 transition-all duration-500 hover:border-white-50 hover:shadow-2xl hover:shadow-blue-100/20"
              onMouseEnter={() => setHoveredCard(post.id)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              {/* Animated gradient border effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 -translate-x-full group-hover:translate-x-full transform"></div>

              {/* Image Container */}
              <div className="relative overflow-hidden">
                <img
                  src={post.image}
                  alt={post.title}
                  className="w-full h-48 md:h-56 object-cover transition-transform duration-700 group-hover:scale-110"
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black-100/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                {/* Category badge */}
                <div className="absolute top-4 left-4">
                  <span className="bg-black-200/90 backdrop-blur-sm text-white-50 px-3 py-1 rounded-full text-sm font-medium border border-black-50">
                    {post.category}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <h2 className="text-xl md:text-2xl font-semibold mb-3 text-white group-hover:text-blue-50 transition-colors duration-300 line-clamp-2">
                  {post.title}
                </h2>

                <div className="flex items-center gap-2 text-sm text-white-50 mb-4">
                  <span>{post.author}</span>
                  <span className="w-1 h-1 bg-white-50 rounded-full"></span>
                  <span>{post.date}</span>
                  <span className="w-1 h-1 bg-white-50 rounded-full"></span>
                  <span>{post.readTime}</span>
                </div>

                <p className="text-white-50 mb-6 line-clamp-3">
                  {post.excerpt}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="bg-black-200 text-white-50 px-3 py-1 rounded-full text-sm hover:bg-black-50 transition-colors duration-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Read More Button */}
                <div className="flex justify-between items-center">
                  <button className="group/btn flex items-center gap-2 text-white-50 hover:text-white transition-colors duration-300">
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
                  </button>

                  {/* Bookmark icon */}
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

              {/* Hover glow effect */}
              {hoveredCard === post.id && (
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 opacity-20 pointer-events-none"></div>
              )}
            </article>
          ))}
        </div>

        {/* Load More Button */}
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
