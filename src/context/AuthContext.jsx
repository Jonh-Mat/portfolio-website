import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is logged in on app start
  useEffect(() => {
    const checkAuth = () => {
      try {
        const token = localStorage.getItem("authToken");
        const userData = localStorage.getItem("userData");

        if (token && userData) {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
        }
      } catch (error) {
        console.error("Error checking auth:", error);
        localStorage.removeItem("authToken");
        localStorage.removeItem("userData");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = (data) => {
    try {
      // Store token and user data
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("userData", JSON.stringify(data.user));
      setUser(data.user);
    } catch (error) {
      console.error("Error during login:", error);
    }
  };

  const logout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userData");
    setUser(null);
  };

  const isAdmin = () => {
    return user && user.role === "admin";
  };

  const isAuthenticated = () => {
    return !!user;
  };

  const getAuthToken = () => {
    return localStorage.getItem("authToken");
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAdmin,
    isAuthenticated,
    getAuthToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
