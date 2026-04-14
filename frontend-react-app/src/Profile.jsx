import React, { useEffect, useState } from "react";
import axios from "axios";
import "./Profile.css";

const Profile = () => {
  const userId = localStorage.getItem("userId"); // make sure you store this after login

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
      const res = await axios.get(`http://localhost:8080/api/users/${userId}`);
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
      await axios.put(`http://localhost:8080/api/users/${userId}`, user);
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
        `http://localhost:8080/api/upload/profile/${userId}`,
        formData
      );

      setUser({ ...user, profilePicture: res.data.path });
    } catch (err) {
      console.error("Upload error:", err);
    }
  };

  return (
    <div className="profile-container">
      <div className="profile-card">

        {/* Profile Image */}
        <div className="profile-image-section">
          <img
            src={`http://localhost:8080${user.profilePicture}`}
            alt="Profile"
            className="profile-image"
          />

          <input type="file" onChange={handleFileChange} />
          <button onClick={handleUpload}>Upload</button>
        </div>

        {/* User Info */}
        <div className="profile-info">

          <label>Username:</label>
          {editMode ? (
            <input
              name="username"
              value={user.username}
              onChange={handleChange}
            />
          ) : (
            <p>{user.username}</p>
          )}

          <label>Email:</label>
          {editMode ? (
            <input
              name="email"
              value={user.email}
              onChange={handleChange}
            />
          ) : (
            <p>{user.email}</p>
          )}

          <label>Password:</label>
          <p>********</p>

          {/* Buttons */}
          <div className="profile-buttons">
            {editMode ? (
              <>
                <button onClick={handleSave}>Save</button>
                <button onClick={() => setEditMode(false)}>Cancel</button>
              </>
            ) : (
              <button onClick={() => setEditMode(true)}>Edit Profile</button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default Profile;