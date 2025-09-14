import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import metroTrain from "../assets/metro_train.jpg";
import metroStation from "../assets/metro_station.jpg";
import metroInterior from "../assets/metro_interior.jpg";
import metroTracks from "../assets/metro_tracks.jpg";

export default function LandingPage() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 via-white to-gray-50">
      {/* Header */}
      <header className="bg-white shadow-md fixed top-0 left-0 w-full z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          {/* Logo */}
          <div
            className="flex items-center space-x-2 cursor-pointer"
            onClick={() => navigate("/")}
          >
            <img
              src={metroTrain}
              alt="KMRL Logo"
              className="w-10 h-10 rounded-full object-cover"
            />
            <span className="text-xl font-bold text-gray-800">KMRL Hub</span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex space-x-8 text-gray-700 font-medium">
            
          </nav>

          {/* Mobile Hamburger */}
          <button
            className="md:hidden text-gray-700"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            ☰
          </button>

          {/* Sign In */}
          <button
            onClick={() => navigate("/signin")}
            className="hidden md:block px-5 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
          >
            Sign In
          </button>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden bg-white shadow-md px-6 py-4 space-y-2">
            <a href="#" className="block text-gray-700 hover:text-blue-600">Home</a>
            <a href="#" className="block text-gray-700 hover:text-blue-600">About</a>
            <a href="#" className="block text-gray-700 hover:text-blue-600">Projects</a>
            <a href="#" className="block text-gray-700 hover:text-blue-600">Contact</a>
            <button
              onClick={() => navigate("/signin")}
              className="w-full mt-2 px-5 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
            >
              Sign In
            </button>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative flex flex-col items-center text-center p-8 md:p-20 mt-20">
        <div className="relative w-full max-w-5xl">
          <img
            src={metroTrain}
            alt="Kochi Metro Train"
            className="w-full h-72 md:h-96 object-cover rounded-2xl shadow-lg"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent rounded-2xl"></div>
          <h1 className="absolute bottom-6 left-1/2 transform -translate-x-1/2 text-4xl md:text-5xl font-extrabold text-white drop-shadow-lg">
            Kochi Metro Rail Limited
          </h1>
        </div>

        <p className="text-gray-700 text-lg mt-8 max-w-2xl leading-relaxed">
          KMRL is a modern urban metro system in Kochi, India. Our Smart Document
          Hub helps you manage engineering, finance, and regulatory documents
          with ease — summaries, auto-categorization, and secure storage.
        </p>

        <div className="flex space-x-4 mt-6">
          <button
            onClick={() => navigate("/signin")}
            className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700 hover:scale-105 transition"
          >
            Get Started
          </button>
          <button
            className="px-8 py-3 border border-blue-600 text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition"
          >
            Learn More
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-6 md:px-16 bg-gray-100 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-10">Why Choose KMRL Hub?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 bg-white rounded-xl shadow hover:shadow-lg transition">
            <h3 className="text-xl font-semibold mb-2">📂 Smart Document Handling</h3>
            <p className="text-gray-600">Organize and categorize thousands of files with AI-powered automation.</p>
          </div>
          <div className="p-6 bg-white rounded-xl shadow hover:shadow-lg transition">
            <h3 className="text-xl font-semibold mb-2">🔒 Secure Storage</h3>
            <p className="text-gray-600">Keep sensitive information safe with enterprise-grade encryption.</p>
          </div>
          <div className="p-6 bg-white rounded-xl shadow hover:shadow-lg transition">
            <h3 className="text-xl font-semibold mb-2">⚡ Fast Access</h3>
            <p className="text-gray-600">Search, filter, and retrieve documents instantly across departments.</p>
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 p-6 md:px-16">
        {[metroStation, metroInterior, metroTracks, metroTrain].map(
          (img, idx) => (
            <div key={idx} className="overflow-hidden rounded-xl shadow-md hover:shadow-xl transition">
              <img
                src={img}
                alt={`Metro ${idx}`}
                className="w-full h-48 object-cover transform hover:scale-110 transition duration-300"
              />
            </div>
          )
        )}
      </section>

      {/* CTA Section */}
      <section className="text-center py-16 bg-blue-600 text-white">
        <h2 className="text-3xl font-bold mb-4">Experience the Future of Kochi</h2>
        <p className="mb-6 text-lg">
          From efficient transport to digital solutions, KMRL is transforming
          the way the city moves.
        </p>
        <button
          onClick={() => navigate("/signin")}
          className="px-8 py-3 bg-white text-blue-600 font-semibold rounded-lg shadow hover:bg-gray-100 transition"
        >
          Join Now
        </button>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 text-center py-10 mt-auto">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-left px-6">
          <div>
            <h3 className="text-white font-semibold mb-3">KMRL Hub</h3>
            <p className="text-sm">
              Kochi Metro Rail Limited’s Smart Document Hub for a modern, digital future.
            </p>
          </div>
          
          <div>
            <h3 className="text-white font-semibold mb-3">Contact</h3>
            <p className="text-sm">📍 Kochi, Kerala, India</p>
            <p className="text-sm">✉️ info@kmrlhub.com</p>
            <p className="text-sm">📞 +91 484 123 4567</p>
          </div>
        </div>
        <p className="text-sm mt-8">&copy; {new Date().getFullYear()} Kochi Metro Rail Limited. All rights reserved.</p>
      </footer>
    </div>
  );
}
