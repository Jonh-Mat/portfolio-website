import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated()) {
      navigate("/blog");
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        login(data);
        navigate("/blog");
      } else {
        setError(data.error || "Login failed");
      }
    } catch (err) {
      setError("Server error. Please try again.");
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (isAuthenticated()) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black-100 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md p-8 card-border rounded-xl"
      >
        <h2 className="text-2xl font-bold mb-6 text-white-50 text-center">
          Login
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-md text-red-300">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-white-50 mb-2">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-blue-100 rounded-md text-white-50"
            required
            disabled={loading}
          />
        </div>

        <div className="mb-6">
          <label className="block text-white-50 mb-2">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-blue-100 rounded-md text-white-50"
            required
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-white text-black font-semibold rounded-md hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Signing In..." : "Sign In"}
        </button>

        <div className="mt-6 text-center text-white-50">
          <p>
            Don't have an account?{" "}
            <Link
              to="/register"
              className="bg-transparent text-white-50 hover:underline hover:text-white"
            >
              Sign Up
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
};

export default Login;
