import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { navLinks } from "../constants";

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      setScrolled(isScrolled);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Check if we're on blog-related pages
  const isBlogPage = location.pathname.startsWith("/blog");
  const isAuthPage =
    location.pathname === "/login" || location.pathname === "/register";

  // Get appropriate nav links based on current page
  const getNavLinks = () => {
    if (isBlogPage) {
      const blogNavLinks = [
        { name: "Home", link: "/" },
        { name: "Blog", link: "/blog" },
      ];

      if (isAdmin()) {
        blogNavLinks.push({ name: "Manage Blog", link: "/blog-management" });
      }

      return blogNavLinks;
    }

    // Filter out blog link if user is not authenticated
    return navLinks.filter((link) => {
      if (link.link === "/blog") {
        return isAuthenticated();
      }
      return true;
    });
  };

  const handleLogout = () => {
    logout();
    navigate("/");
    setIsMobileMenuOpen(false);
  };

  const handleNavClick = (link) => {
    if (link.startsWith("/")) {
      navigate(link);
    } else {
      // For hash links, navigate to home first if not already there
      if (location.pathname !== "/") {
        navigate("/");
        // Wait for navigation then scroll to section
        setTimeout(() => {
          const element = document.querySelector(link);
          if (element) {
            element.scrollIntoView({ behavior: "smooth" });
          }
        }, 100);
      } else {
        const element = document.querySelector(link);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }
    }
    setIsMobileMenuOpen(false);
  };

  // Don't show navbar on auth pages
  if (isAuthPage) {
    return null;
  }

  const currentNavLinks = getNavLinks();

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-black/90 backdrop-blur-md" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <div className="flex-shrink-0">
            <button
              onClick={() => navigate("/")}
              className="text-white font-bold text-xl lg:text-2xl hover:text-blue-400 transition-colors"
            >
              CMJ
            </button>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {currentNavLinks.map(({ link, name }) => (
              <button
                key={name}
                onClick={() => handleNavClick(link)}
                className="group relative text-white hover:text-white-50 transition-colors duration-300"
              >
                <span className="text-sm lg:text-base font-medium">{name}</span>
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-white-50 transition-all duration-300 group-hover:w-full" />
              </button>
            ))}
          </nav>

          {/* Auth Actions & Contact */}
          <div className="hidden md:flex items-center space-x-4">
            {location.pathname !== "/" && (
              <div className="hidden md:flex items-center space-x-4">
                {isAuthenticated() ? (
                  <div className="flex items-center space-x-4">
                    <span className="text-white text-sm">
                      Hi, {user?.name || user?.email}
                      {isAdmin() && (
                        <span className="ml-1 px-2 py-1 text-xs bg-blue-600 text-white rounded-full">
                          Admin
                        </span>
                      )}
                    </span>
                    <button
                      onClick={handleLogout}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => navigate("/login")}
                      className="px-4 py-2 text-sm font-medium text-white hover:text-blue-400 transition-colors"
                    >
                      Login
                    </button>
                    <button
                      onClick={() => navigate("/register")}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                    >
                      Register
                    </button>
                  </div>
                )}

                {/* Contact Button - only show on home page */}
                {location.pathname === "/" && (
                  <button
                    onClick={() => handleNavClick("#contact")}
                    className="group relative px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300"
                  >
                    <span>Contact me</span>
                  </button>
                )}
              </div>
            )}

            {/* Contact Button - only show on home page */}
            {location.pathname === "/" && (
              <button
                onClick={() => handleNavClick("#contact")}
                className="group relative px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300"
              >
                <span>Contact me</span>
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-white hover:text-blue-400 transition-colors"
              aria-label="Toggle mobile menu"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isMobileMenuOpen ? (
                  <path d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-black/95 backdrop-blur-md border-t border-gray-800">
          <div className="px-4 py-4 space-y-3">
            {/* Navigation Links */}
            {currentNavLinks.map(({ link, name }) => (
              <button
                key={name}
                onClick={() => handleNavClick(link)}
                className="block w-full text-left px-4 py-2 text-white hover:text-blue-400 hover:bg-gray-800/50 rounded-lg transition-all duration-300"
              >
                {name}
              </button>
            ))}

            {/* Contact Button - only show on home page */}
            {location.pathname === "/" && (
              <button
                onClick={() => handleNavClick("#contact")}
                className="block w-full text-left px-4 py-2 text-white hover:text-blue-400 hover:bg-gray-800/50 rounded-lg transition-all duration-300"
              >
                Contact me
              </button>
            )}

            {/* Auth Section */}
            {location.pathname !== "/" && (
              <div className="border-t border-gray-800 pt-3 mt-3">
                {isAuthenticated() ? (
                  <div className="space-y-3">
                    <div className="px-4 py-2 text-white text-sm">
                      Hi, {user?.name || user?.email}
                      {isAdmin() && (
                        <span className="ml-2 px-2 py-1 text-xs bg-blue-600 text-white rounded-full">
                          Admin
                        </span>
                      )}
                    </div>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        navigate("/login");
                        setIsMobileMenuOpen(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-white hover:text-blue-400 hover:bg-gray-800/50 rounded-lg transition-all duration-300"
                    >
                      Login
                    </button>
                    <button
                      onClick={() => {
                        navigate("/register");
                        setIsMobileMenuOpen(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                    >
                      Register
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
