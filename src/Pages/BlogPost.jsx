import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";

const BlogPost = () => {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [error, setError] = useState(null);
  const API_URL = "http://localhost:5000/api/posts";

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const res = await fetch(`${API_URL}/${id}`);
        const data = await res.json();
        setPost(data);
      } catch (err) {
        setError("Failed to load post");
      }
    };
    fetchPost();
  }, [id]);

  if (error) return <p className="text-red-500 p-4">{error}</p>;
  if (!post) return <p className="text-white-50 p-4">Loading...</p>;

  return (
    <div className="min-h-screen bg-black text-white py-16 px-4 md:px-20">
      <div className="max-w-4xl mx-auto">
        <img
          src={post.image}
          alt={post.title}
          className="rounded-xl mb-8 w-full h-80 object-cover border border-black-50"
        />
        <h1 className="text-4xl font-bold mb-4">{post.title}</h1>
        <p className="text-white-50 text-sm mb-6">
          {post.author} • {new Date(post.date).toLocaleDateString()} •{" "}
          {post.readTime}
        </p>

        <div className="text-white-50 mb-8">{post.excerpt}</div>

        <article className="prose prose-invert max-w-none">
          <ReactMarkdown>{post.content}</ReactMarkdown>
        </article>
      </div>
    </div>
  );
};

export default BlogPost;
