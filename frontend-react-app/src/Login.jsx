import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";
import axios from './axiosConfig.js';

function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    
    try {
      const res = await axios.post('/api/auth/login', formData);
      const { token, role, id, username, email } = res.data;

      // Store all user data in localStorage
      localStorage.setItem("token", token);
      localStorage.setItem("role", role);
      localStorage.setItem("userId", id);
      localStorage.setItem("username", username);
      localStorage.setItem("userEmail", email);
      
      // Show success message briefly
      setMessage("Login successful! Redirecting...");
      
      // Redirect based on role
      setTimeout(() => {
        if (role === "ADMIN") {
          navigate("/admin");
        } else {
          navigate("/dashboard");
        }
      }, 1000);
      
    } catch (err) {
      setMessage("Invalid email or password");
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h2>👋 Welcome Back</h2>
          <p>Sign in to continue to Smart Task Manager</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <span className="input-icon">📧</span>
            <input
              type="email"
              name="email"
              placeholder="Email address"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>

          <div className="input-group">
            <span className="input-icon">🔒</span>
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>

          <button 
            type="submit" 
            className={`login-btn ${loading ? 'loading' : ''}`}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          {message && (
            <div className={message.includes("successful") ? "success-message" : "error-message"}>
              {message}
            </div>
          )}
        </form>

        <div className="login-footer">
          <p>Don't have an account?</p>
          <button 
            onClick={() => navigate("/signup")} 
            className="signup-link"
            disabled={loading}
          >
            Create Account
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;