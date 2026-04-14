import React, { useEffect, useState } from "react";
import "./Profile.css";
import axios from './axiosConfig.js';
import { useNavigate } from "react-router-dom";

const Profile = () => {
  const userId = localStorage.getItem("userId");
  const navigate = useNavigate();

  const [user, setUser] = useState({
    username: "",
    email: "",
    profilePicture: ""
  });

  const [editMode, setEditMode] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  // 🔽 Fetch user data
  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await axios.get(`/api/users/${userId}`);
      setUser(res.data);
    } catch (err) {
      console.error("Error fetching user:", err);
    }
  };

  // 🔽 Handle input change
  const handleChange = (e) => {
    setUser({ ...user, [e.target.name]: e.target.value });
  };

  // 🔽 Save profile changes
  const handleSave = async () => {
    try {
      await axios.put(`/api/users/${userId}`, user);
      setEditMode(false);
      alert("Profile updated!");
    } catch (err) {
      console.error(err);
    }
  };

  // 🔽 Handle profile picture change
  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await axios.post(
        `/api/upload/profile/${userId}`,
        formData
      );

      setUser({ ...user, profilePicture: res.data.path });
    } catch (err) {
      console.error("Upload error:", err);
    }
  };
  const handleDashboardRedirect = () => {
    if (user.role === "ADMIN") {
      navigate("/admin");
    } else {
      navigate("/dashboard");
    }
  };
  return (
    <div className="profile-page">
      <div className="profile-header">
        <h2>My Profile</h2>
        <button
          className="dashboard-btn"
          onClick={handleDashboardRedirect}
        >
          ⬅ Dashboard
        </button>
      </div>

      <div className="profile-card-modern">

        {/* LEFT - Profile Image */}
        <div className="profile-left">
          <img
            src={user.profilePicture}
            alt="Profile"
            className="profile-avatar"
          />

          <input type="file" onChange={handleFileChange} />
          <button className="upload-btn" onClick={handleUpload}>
            Upload Image
          </button>
        </div>

        {/* RIGHT - User Info */}
        <div className="profile-right">

          <div className="profile-field">
            <label>Username</label>
            {editMode ? (
              <input
                name="username"
                value={user.username}
                onChange={handleChange}
              />
            ) : (
              <p>{user.username}</p>
            )}
          </div>

          <div className="profile-field">
            <label>Email</label>
            {editMode ? (
              <input
                name="email"
                value={user.email}
                onChange={handleChange}
              />
            ) : (
              <p>{user.email}</p>
            )}
          </div>

          <div className="profile-field">
            <label>Password</label>
            <p>••••••••</p>
          </div>

          <div className="profile-actions">
            {editMode ? (
              <>
                <button className="save-btn" onClick={handleSave}>Save</button>
                <button className="cancel-btn" onClick={() => setEditMode(false)}>Cancel</button>
              </>
            ) : (
              <button className="edit-btn" onClick={() => setEditMode(true)}>
                Edit Profile
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default Profile;