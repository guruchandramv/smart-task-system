import React, { useState } from "react";
import axios from './axiosConfig.js';
import { useNavigate, Link } from "react-router-dom";
import "./Signup.css";

function Signup() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: ""
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState("");
  const [showRequirements, setShowRequirements] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    if (name === "password") {
      checkPasswordStrength(value);
    }
  };

  const checkPasswordStrength = (password) => {
    if (password.length === 0) {
      setPasswordStrength("");
      return;
    }
    
    const hasLowerCase = /[a-z]/.test(password);
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const isLongEnough = password.length >= 8;
    
    const strengthScore = [
      hasLowerCase, hasUpperCase, hasNumbers, hasSpecialChar, isLongEnough
    ].filter(Boolean).length;
    
    if (strengthScore <= 2) {
      setPasswordStrength("weak");
    } else if (strengthScore <= 4) {
      setPasswordStrength("medium");
    } else {
      setPasswordStrength("strong");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    axios.post(`/api/auth/signup`, formData)
      .then(() => {
        setMessage("Signup successful! Redirecting to login...");
        setTimeout(() => navigate("/login"), 2000);
      })
      .catch((error) => {
        setMessage(error.response?.data || "Signup failed. Please try again.");
        setLoading(false);
      });
  };

  const getStrengthText = () => {
    switch(passwordStrength) {
      case "weak": return "Weak password";
      case "medium": return "Medium password";
      case "strong": return "Strong password";
      default: return "";
    }
  };

  const passwordRequirements = [
    { text: "At least 8 characters long", met: formData.password.length >= 8 },
    { text: "Contains lowercase letter", met: /[a-z]/.test(formData.password) },
    { text: "Contains uppercase letter", met: /[A-Z]/.test(formData.password) },
    { text: "Contains number", met: /\d/.test(formData.password) },
    { text: "Contains special character", met: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password) }
  ];

  return (
    <div className="signup-container">
      <div className="signup-card">
        <div className="signup-header">
          <h2>✨ Join Smart Task Manager</h2>
          <p>Create your account to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="signup-form">
          <div className="input-group">
            <span className="input-icon">👤</span>
            <input
              type="text"
              name="username"
              placeholder="Username"
              value={formData.username}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>

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
              onFocus={() => setShowRequirements(true)}
              onBlur={() => setShowRequirements(false)}
              required
              disabled={loading}
            />
            
            {passwordStrength && (
              <div className="password-strength">
                <div className="strength-bar">
                  <div className={`strength-bar-fill ${passwordStrength}`}></div>
                </div>
                <span className={`strength-text ${passwordStrength}`}>
                  {getStrengthText()}
                </span>
              </div>
            )}

            {showRequirements && (
              <div className="password-requirements">
                <strong>Password requirements:</strong>
                <ul>
                  {passwordRequirements.map((req, index) => (
                    <li key={index} className={req.met ? "valid" : "invalid"}>
                      {req.met ? "✓" : "✗"} {req.text}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <button 
            type="submit" 
            className={`signup-btn ${loading ? 'loading' : ''}`}
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>

          {message && (
            <div className={message.includes("successful") ? "success-message" : "error-message"}>
              {message}
            </div>
          )}

          <div className="terms-text">
            By signing up, you agree to our <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>
          </div>
        </form>

        <div className="signup-footer">
          <p>Already have an account?</p>
          <Link to="/login" className="login-link">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Signup;