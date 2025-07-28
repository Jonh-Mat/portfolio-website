import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Hero from "./sections/Hero";
import ShowCaseSection from "./sections/ShowCaseSection";
import LogoSection from "./sections/LogoSection";
import FeatureCard from "./sections/FeatureCard";
import Experience from "./sections/Experience";
import TechStack from "./sections/TechStack";
import TEstimonials from "./sections/TEstimonials";
import Contact from "./sections/Contact";
import Footer from "./sections/Footer";
import Blog from "./Pages/Blog";
import BlogManagement from "./Pages/BlogManagement";
import BlogPost from "./Pages/BlogPost";
import { AuthProvider } from "./context/AuthContext";

import Register from "./Pages/Register";
import { PrivateRoute } from "./components/PrivateRoute";
import Login from "./Pages/Login";
const App = () => {
  return (
    <AuthProvider>
      <Navbar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            <>
              <Hero />
              <ShowCaseSection />
              <LogoSection />
              <FeatureCard />
              <Experience />
              <TechStack />
              <TEstimonials />
              <Contact />
              <Footer />
            </>
          }
        />
        <Route
          path="/blog"
          element={
            <PrivateRoute>
              <Blog />
            </PrivateRoute>
          }
        />
        <Route
          path="/blog-management"
          element={
            <PrivateRoute adminOnly>
              <BlogManagement />
            </PrivateRoute>
          }
        />
        <Route
          path="/blog/:id"
          element={
            <PrivateRoute>
              <BlogPost />
            </PrivateRoute>
          }
        />
      </Routes>
    </AuthProvider>
  );
};

export default App;
