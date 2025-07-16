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

const App = () => {
  return (
    <>
      <Navbar />
      <Routes>
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
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog-management" element={<BlogManagement />} />
      </Routes>
    </>
  );
};

export default App;
