import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./Signup.css";
import axios from './axiosConfig.js';

function Signup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: ""
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState("");
  const [showRequirements, setShowRequirements] = useState(false);
  const canvasRef = useRef(null);

  const features = [
    { icon: "🚀", title: "Quick Setup", description: "Create your account in seconds and start managing tasks immediately" },
    { icon: "🔒", title: "Secure Access", description: "Your data is encrypted and protected with industry-standard security" },
    { icon: "📱", title: "Cross-Platform", description: "Access your tasks from anywhere, on any device" },
    { icon: "💡", title: "Smart Insights", description: "Get intelligent recommendations to boost your productivity" }
  ];

  // Particle Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let particles = [];

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const createParticles = () => {
      const particleCount = 80;
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: Math.random() * 2 + 1,
          speedX: (Math.random() - 0.5) * 0.3,
          speedY: (Math.random() - 0.5) * 0.3,
          opacity: Math.random() * 0.4 + 0.1
        });
      }
    };

    const drawParticles = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach(particle => {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${particle.opacity})`;
        ctx.fill();
        
        particle.x += particle.speedX;
        particle.y += particle.speedY;
        
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;
      });
      
      animationFrameId = requestAnimationFrame(drawParticles);
    };

    const init = () => {
      resizeCanvas();
      createParticles();
      drawParticles();
    };

    init();

    window.addEventListener('resize', () => {
      resizeCanvas();
      particles = [];
      createParticles();
    });

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

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

    axios.post('/api/auth/signup', formData)
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
      {/* Background Layers */}
      <div className="animated-bg"></div>
      <canvas ref={canvasRef} className="particle-canvas"></canvas>
      <div className="floating-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>

      {/* Left Section - Features with Large Text */}
      <div className="left-section">
        <div className="features-content">
          <div className="main-heading">
            <h1>Join Smart Task Manager</h1>
            <p className="tagline">Start your productivity journey today with our intelligent task management platform</p>
          </div>
          
          <div className="feature-list">
            {features.map((feature, index) => (
              <div key={index} className="feature-item">
                <div className="feature-icon-large">{feature.icon}</div>
                <div className="feature-text">
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Section - Signup Card */}
      <div className="right-section">
        <div className="signup-card">
          <div className="signup-header">
            <div className="logo-wrapper">
              <div className="logo">✨</div>
              <div className="ripple"></div>
            </div>
            <h2>Create Account</h2>
            <p>Get started with your free account</p>
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
                        {req.met ? "✓" : "○"} {req.text}
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
    </div>
  );
}

export default Signup;