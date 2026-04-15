import React, { useEffect, useState } from "react";
import "./Profile.css";
import axios from './axiosConfig.js';
import { useNavigate } from "react-router-dom";
import { useRef } from "react";

const Profile = () => {
  const userId = localStorage.getItem("userId");
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [user, setUser] = useState({
    username: "",
    email: "",
    profilePicture: ""
  });

  const [editMode, setEditMode] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

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

      setSuccessMessage("Profile updated successfully ✅");

      // Auto hide after 3 seconds
      setTimeout(() => {
        setSuccessMessage("");
        setEditMode(false);
      }, 3000);

    } catch (error) {
      console.error(error);
    }
  };

  // 🔽 Handle profile picture change
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post(
        `https://smart-task-system-production-8b1e.up.railway.app/api/upload/profile/${userId}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      // 🔥 instantly update UI
      setUser((prev) => ({
        ...prev,
        profilePicture: res.data.path,
      }));

    } catch (err) {
      console.error("Upload error:", err);
    }
  };
  const handleUploadClick = () => {
    fileInputRef.current.click();
  };
  const handleUpload = async () => {
    const formData = new FormData();
    formData.append("file", selectedFile);

    try {

       console.log(selectedFile);
      const response = await axios.post(
        `https://smart-task-system-production-8b1e.up.railway.app/api/upload/profile/${userId}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      console.log("Upload success:", response.data);
    } catch (error) {
      console.error("Upload error:", error);
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
      </div>
      <div className="profile-card-modern">

        {/* LEFT - Profile Image */}
        <div className="profile-left">
          <img
            src={user.profilePicture}
            alt="Profile"
            className="profile-avatar"
          />
            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleFileChange}
            />

            {/* Upload Button */}
            <button className="upload-btn" onClick={handleUploadClick}>
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
                disabled
                className="disabled-input"
              />
            ) : (
              <p>{user.email}</p>
            )}
          </div>

          <div className="profile-field password-row">
              <label>Password</label>
                    
              <div className="password-container">
                <p>••••••••</p>
                    
                <button
                  className="reset-password-btn"
                  onClick={() => navigate("/reset-password")}
                >
                  Reset Password
                </button>
              </div>
            </div>

          <div className="profile-actions">
            {editMode ? (
              <>
                <button className="save-btn" onClick={handleSave}>Save</button>
                <button className="cancel-btn" onClick={() => setEditMode(false)}>Cancel</button>
                {successMessage && (
                  <p className="success-text">{successMessage}</p>
                )}
              </>
            ) : (
              <button className="edit-btn" onClick={() => setEditMode(true)}>
                Edit Profile
              </button>
            )}
          </div>

        </div>
      </div>
      <br/>
      <button className="dashboard-btn" onClick={handleDashboardRedirect}> ⬅ Dashboard</button>
    </div>
  );
};

export default Profile;