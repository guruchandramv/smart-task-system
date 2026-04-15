import React, { useState } from "react";
import "./Profile.css"; // reuse styles or create new CSS
import axios from "./axiosConfig";
import { useNavigate } from "react-router-dom";

const ResetPassword = () => {
  const navigate = useNavigate();
  const email = localStorage.getItem("userEmail");

  const [form, setForm] = useState({
    oldPassword: "",
    newPassword: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleReset = async () => {
    setMessage("");
    setError("");

    try {
      const res = await axios.post("/api/auth/change-password", {
        email,
        oldPassword: form.oldPassword,
        newPassword: form.newPassword,
      });

      setMessage("Password updated successfully ✅");

      setTimeout(() => {
        navigate("/profile");
      }, 2000);

    } catch (err) {
      setError(err.response?.data || "Error updating password");
    }
  };

  return (
    <div className="profile-page">
      <div className="profile-card-modern">

        <h2 style={{ marginBottom: "20px" }}>Reset Password</h2>

        <div className="profile-field">
          <label>Old Password</label>
          <input
            type="password"
            name="oldPassword"
            value={form.oldPassword}
            onChange={handleChange}
            placeholder="Enter old password"
          />
        </div>

        <div className="profile-field">
          <label>New Password</label>
          <input
            type="password"
            name="newPassword"
            value={form.newPassword}
            onChange={handleChange}
            placeholder="Enter new password"
          />
        </div>

        <div className="profile-actions">
          <button className="save-btn" onClick={handleReset}>
            Update Password
          </button>

          <button
            className="cancel-btn"
            onClick={() => navigate("/profile")}
          >
            Cancel
          </button>
        </div>

        {message && <p className="success-text">{message}</p>}
        {error && <p style={{ color: "red" }}>{error}</p>}

      </div>
    </div>
  );
};

export default ResetPassword;