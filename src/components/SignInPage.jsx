import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

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

  // Simple captcha: add two numbers
  const [captcha, setCaptcha] = useState({
    a: Math.floor(Math.random() * 10 + 1),
    b: Math.floor(Math.random() * 10 + 1),
  });

  const roles = ["admin", "engineer", "finance"];

  function handleLogin(e) {
    e.preventDefault();
    if (!selectedRole) {
      setError("Select a user role first");
      return;
    }

    // Check captcha
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
    setCaptcha({ a: Math.floor(Math.random() * 10 + 1), b: Math.floor(Math.random() * 10 + 1) });
    setCaptchaInput("");
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">Sign In</h1>

      <div className="flex gap-4 mb-6 flex-wrap justify-center">
        {roles.map((role) => (
          <button
            key={role}
            onClick={() => setSelectedRole(role)}
            className={`px-6 py-4 rounded-lg shadow-md border transition ${
              selectedRole === role
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-900 border-gray-300 hover:bg-gray-100"
            }`}
          >
            {role.charAt(0).toUpperCase() + role.slice(1)}
          </button>
        ))}
      </div>

      {selectedRole && (
        <form
          onSubmit={handleLogin}
          className="bg-white p-6 rounded-lg shadow-md w-full max-w-sm flex flex-col gap-4"
        >
          <h2 className="text-xl font-semibold mb-2 capitalize">{selectedRole} Login</h2>

          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="p-2 border rounded-md w-full"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="p-2 border rounded-md w-full"
            required
          />

          {/* Simple Captcha */}
          <div className="flex items-center gap-2">
            <span className="font-semibold">
              {captcha.a} + {captcha.b} = ?
            </span>
            <input
              type="number"
              value={captchaInput}
              onChange={(e) => setCaptchaInput(e.target.value)}
              className="p-2 border rounded-md w-20"
              required
            />
          </div>

          {error && <div className="text-red-600 text-sm">{error}</div>}

          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Sign In
          </button>
        </form>
      )}
    </div>
  );
}
