import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";
import axios from './axiosConfig.js';

function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef(null);

  const features = [
    { icon: "📊", title: "Smart Analytics", description: "Real-time task insights and performance metrics" },
    { icon: "👥", title: "Team Collaboration", description: "Assign tasks and track team progress seamlessly" },
    { icon: "⚡", title: "Live Updates", description: "Instant status changes and real-time notifications" },
    { icon: "🔔", title: "Smart Alerts", description: "Never miss important deadlines and updates" }
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
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const res = await axios.post('/api/auth/login', formData);
      const { token, role, id, username, email, profilePicture } = res.data;

      localStorage.setItem("token", token);
      localStorage.setItem("role", role);
      localStorage.setItem("userId", id);
      localStorage.setItem("username", username);
      localStorage.setItem("userEmail", email);
      localStorage.setItem("profilePicture", profilePicture || "/uploads/profile_pictures/default.png");

      setMessage("Login successful! Redirecting...");

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
            <h1>Smart Task Management</h1>
            <p className="tagline">Streamline your workflow with intelligent task management and real-time collaboration</p>
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

      {/* Right Section - Login Card */}
      <div className="right-section">
        <div className="login-card">
          <div className="login-header">
            <div className="logo-wrapper">
              <div className="logo">📋</div>
              <div className="ripple"></div>
            </div>
            <h2>Welcome Back</h2>
            <p>Sign in to access your dashboard</p>
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
    </div>
  );
}

export default Login;