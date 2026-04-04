import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from './axiosConfig.js';
import "./ProfilePage.css";

function ProfilePage() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState({
    id: null,
    username: "",
    email: "",
    role: "",
    lastLogin: null,
    lastActivity: null,
    isOnline: false
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: ""
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("userId");

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    if (userId) {
      fetchUserProfile(userId);
    }
  }, [navigate]);

  const fetchUserProfile = async (userId) => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/activity/user-status/${userId}`);
      const user = response.data;
      setUserData({
        id: user.userId,
        username: user.username,
        email: user.email,
        role: localStorage.getItem("role"),
        lastLogin: user.lastLogin,
        lastActivity: user.lastActivity,
        isOnline: user.isOnline
      });
      setFormData({
        username: user.username,
        email: user.email
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
      setError("Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "Never";
    const date = new Date(timestamp);
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdateProfile = async () => {
    try {
      await axios.put(`/api/users/${userData.id}`, formData);
      setUserData(prev => ({
        ...prev,
        username: formData.username,
        email: formData.email
      }));
      localStorage.setItem("username", formData.username);
      localStorage.setItem("userEmail", formData.email);
      setEditing(false);
      setError("");
    } catch (error) {
      setError(error.response?.data?.error || "Failed to update profile");
    }
  };

  const handleBackToDashboard = () => {
    navigate("/dashboard");
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="animated-bg"></div>
      
      <div className="profile-container">
        <button className="back-btn" onClick={handleBackToDashboard}>
          ← Back to Dashboard
        </button>
        
        <div className="profile-card">
          <div className="profile-header">
            <div className="profile-avatar">
              <div className="avatar-large">
                {userData.username ? userData.username.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className={`profile-status ${userData.isOnline ? 'online' : 'offline'}`}></div>
            </div>
            <h2>{userData.username}</h2>
            <p className="user-role">{userData.role}</p>
          </div>

          {error && (
            <div className="error-message">
              ❌ {error}
            </div>
          )}

          <div className="profile-details">
            <div className="detail-section">
              <h3>Personal Information</h3>
              
              {!editing ? (
                <>
                  <div className="detail-row">
                    <label>Username:</label>
                    <span>{userData.username}</span>
                    <button className="edit-btn" onClick={() => setEditing(true)}>
                      ✏️ Edit
                    </button>
                  </div>
                  <div className="detail-row">
                    <label>Email:</label>
                    <span>{userData.email}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="detail-row">
                    <label>Username:</label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      className="edit-input"
                    />
                  </div>
                  <div className="detail-row">
                    <label>Email:</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="edit-input"
                    />
                  </div>
                  <div className="detail-actions">
                    <button className="save-btn" onClick={handleUpdateProfile}>
                      Save Changes
                    </button>
                    <button className="cancel-btn" onClick={() => setEditing(false)}>
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="detail-section">
              <h3>Account Information</h3>
              <div className="detail-row">
                <label>User ID:</label>
                <span>{userData.id}</span>
              </div>
              <div className="detail-row">
                <label>Role:</label>
                <span className="role-badge">{userData.role}</span>
              </div>
              <div className="detail-row">
                <label>Status:</label>
                <span className={`status-badge ${userData.isOnline ? 'online' : 'offline'}`}>
                  {userData.isOnline ? '🟢 Online' : '⚫ Offline'}
                </span>
              </div>
            </div>

            <div className="detail-section">
              <h3>Activity Information</h3>
              <div className="detail-row">
                <label>Last Login:</label>
                <span>{formatDate(userData.lastLogin)}</span>
              </div>
              <div className="detail-row">
                <label>Last Activity:</label>
                <span>{formatDate(userData.lastActivity)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;