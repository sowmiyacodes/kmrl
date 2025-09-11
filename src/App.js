import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./components/LandingPage";
import SignInPage from "./components/SignInPage";
import DashboardPage from "./components/SmartDocumentHub";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/dashboard/:role" element={<DashboardPage />} />
      </Routes>
    </Router>
  );
}

export default App;
