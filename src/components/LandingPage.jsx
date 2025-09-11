import React from "react";
import { useNavigate } from "react-router-dom";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">Kochi Metro Rail Limited (KMRL)</h1>
      <p className="text-gray-700 text-center max-w-xl mb-6">
        KMRL is a modern urban metro system in Kochi, India. Our Smart Document Hub helps
        manage thousands of engineering, finance, and regulatory documents with summaries and auto-categorization.
      </p>
      <button
        onClick={() => navigate("/signin")}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
      >
        Sign In
      </button>
    </div>
  );
}
