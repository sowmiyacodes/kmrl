import React from "react";
import { useNavigate } from "react-router-dom";

export default function SignInPage() {
  const navigate = useNavigate();
  const users = [
    { role: "admin", title: "Admin", description: "Full access to all documents and management" },
    { role: "engineer", title: "Engineer", description: "Access to engineering and safety documents" },
    { role: "finance", title: "Finance", description: "Access to finance and purchase documents" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Select User Type</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
        {users.map(user => (
          <div
            key={user.role}
            onClick={() => navigate(`/dashboard/${user.role}`)}
            className="cursor-pointer p-6 bg-white rounded-lg shadow-md hover:shadow-xl transition"
          >
            <h2 className="text-xl font-semibold text-gray-900">{user.title}</h2>
            <p className="text-gray-600 mt-2">{user.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
