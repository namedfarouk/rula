import { Routes, Route } from "react-router-dom";
import LandingPage from "./components/landing/LandingPage";
import DemoPage from "./components/demo/DemoPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/demo" element={<DemoPage />} />
    </Routes>
  );
}
