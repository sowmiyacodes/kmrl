import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

// Import avatars (keep in src/assets/)
import adminImg from "../assets/admin.jpg";
import engineerImg from "../assets/engineer.jpg";
import financeImg from "../assets/finance.jpg";

// Sample users stored in JSON for prototype
const users = {
  admin: { username: "sowmiya", password: "12345678" },
  engineer: { username: "sowmiya", password: "12345678" },
  finance: { username: "sowmiya", password: "12345678" },
};

export default function SignInPage() {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  const [error, setError] = useState("");

  const [captcha, setCaptcha] = useState({
    a: Math.floor(Math.random() * 10 + 1),
    b: Math.floor(Math.random() * 10 + 1),
  });

  const roles = [
    { id: "admin", label: "Admin", img: adminImg },
    { id: "engineer", label: "Engineer", img: engineerImg },
    { id: "finance", label: "Finance", img: financeImg },
  ];

  function handleLogin(e) {
    e.preventDefault();
    if (!selectedRole) {
      setError("Select a user role first");
      return;
    }

    if (parseInt(captchaInput) !== captcha.a + captcha.b) {
      setError("Captcha is incorrect");
      generateNewCaptcha();
      return;
    }

    const user = users[selectedRole];
    if (user.username === username && user.password === password) {
      setError("");
      navigate(`/dashboard/${selectedRole}`);
    } else {
      setError("Invalid username or password");
      generateNewCaptcha();
    }
  }

  function generateNewCaptcha() {
    setCaptcha({
      a: Math.floor(Math.random() * 10 + 1),
      b: Math.floor(Math.random() * 10 + 1),
    });
    setCaptchaInput("");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex flex-col items-center justify-center p-6">
      <h1 className="text-3xl font-extrabold mb-10 text-gray-900">
        🚇 KMRL Portal Login
      </h1>

      {/* Role selection cards */}
      <div className="flex gap-8 mb-10 flex-wrap justify-center">
        {roles.map((role) => (
          <button
            key={role.id}
            onClick={() => setSelectedRole(role.id)}
            className={`flex flex-col items-center w-40 p-6 rounded-2xl shadow-md border transition transform hover:scale-105 ${
              selectedRole === role.id
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-900 border-gray-300 hover:bg-gray-100"
            }`}
          >
            <img
              src={role.img}
              alt={role.label}
              className="w-20 h-20 mb-3 rounded-full object-cover shadow-sm"
            />
            <span className="font-semibold text-lg">{role.label}</span>
          </button>
        ))}
      </div>

      {/* Login form */}
      {selectedRole && (
        <form
          onSubmit={handleLogin}
          className="bg-white p-6 rounded-lg shadow-lg w-full max-w-sm flex flex-col gap-4 border border-gray-200"
        >
          <h2 className="text-xl font-semibold mb-2 capitalize text-center">
            {selectedRole} Login
          </h2>

          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="p-3 border rounded-md w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="p-3 border rounded-md w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
          />

          {/* Simple Captcha */}
          <div className="flex items-center gap-3">
            <span className="font-semibold text-gray-700">
              {captcha.a} + {captcha.b} = ?
            </span>
            <input
              type="number"
              value={captchaInput}
              onChange={(e) => setCaptchaInput(e.target.value)}
              className="p-2 border rounded-md w-20 focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            />
          </div>

          {error && <div className="text-red-600 text-sm">{error}</div>}

          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-md"
          >
            Sign In
          </button>
        </form>
      )}
    </div>
  );
}
