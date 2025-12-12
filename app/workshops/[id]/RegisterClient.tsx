"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterClient({ workshopId }: { workshopId?: string }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (!formData.name || !formData.email || !formData.phone) {
        setError("Please fill in all required fields");
        setLoading(false);
        return;
      }

      // For now, just redirect to the workshop registration page
      // where user can complete the full registration
      const [firstName, ...lastNameParts] = formData.name.split(" ");
      const lastName = lastNameParts.join(" ") || "User";

      // Store data in session/localStorage to pass to registration page
      sessionStorage.setItem(
        "workshopRegData",
        JSON.stringify({
          firstName,
          lastName,
          email: formData.email,
          phone: formData.phone,
        })
      );

      // Redirect to the workshop registration page
      router.push(`/workshops/${workshopId}/register`);
      setOpen(false);
    } catch (err) {
      setError("An error occurred. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 transition-colors"
      >
        Register Now
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <div className="relative bg-white rounded-lg p-6 shadow-lg max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold mb-4">Quick Registration</h2>
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="name"
                  placeholder="Your full name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-green-500"
                />
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  placeholder="Your email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-green-500"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone"
                  placeholder="Your phone number"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-green-500"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {loading ? "Processing..." : "Continue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
