import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from './axiosConfig.js';
import "./UserDashboard.css";
import { startHeartbeat, stopHeartbeat, logoutUser } from './heartbeatService';

axios.defaults.headers.common['Content-Type'] = 'application/json';

function UserDashboard() {
  const navigate = useNavigate();
  const userId = localStorage.getItem("userId");
  const [assignedTasks, setAssignedTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [errorDetails, setErrorDetails] = useState("");
  const [selectedTask, setSelectedTask] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [message, setMessage] = useState("");
  const [messageHist, setMessageHist] = useState([]);
  const [showMessageHistory, setShowMessageHistory] = useState(false);
  const [userInfo, setUserInfo] = useState({ id: null, username: "", email: "", role: "" });
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [UserProfilePicture, setUserProfilePicture] = useState("");
  const [Username, setUsername] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  // State for user dropdown menu
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef(null);

  // State for user statistics
  const [userStats, setUserStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    overdueTasks: 0,
    inProgressTasks: 0,
    onHoldTasks: 0,
    tasksByPriority: {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0
    }
  });

  // State for showing statistics (always true, no toggle needed)
  const [showStatistics] = useState(true);

  // State for filters
  const [filters, setFilters] = useState({
    status: "",
    priority: "",
    deadline: "",
    search: "",
    showOverdueOnly: false
  });

  // State for sorting
  const [sortConfig, setSortConfig] = useState({
    field: "deadline",
    direction: "asc"
  });

  // USE EFFECTS
  useEffect(() => {
    {console.log("userId: " + userId);}
    // userId = localStorage.getItem("userId");
    axios.get(`/api/users/${userId}`)
      .then(res => {
        setUsername(res.data.username);
        setUserProfilePicture(res.data.profilePicture);
      });
  }, []);
  useEffect(() => {
    if (selectedTask) {
      setCompletionPercentage(selectedTask.completionPercentage);
    }
  }, [selectedTask]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    // const role = localStorage.getItem("role");
    const userId = localStorage.getItem("userId");
    const username = localStorage.getItem("username");
    const userEmail = localStorage.getItem("userEmail");

    setUserInfo({ id: userId, username, email: userEmail });

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    if (!userId) {
      setError("User ID not found. Please login again.");
      setLoading(false);
      return;
    }

    // Start heartbeat for this user
    startHeartbeat(userId);

    fetchAssignedTasks(userId);

    const overdueCheckInterval = setInterval(() => {
      checkOverdueTasks();
    }, 1000);

    return () => {
      clearInterval(overdueCheckInterval);
      stopHeartbeat();
      if (userId) {
        logoutUser(userId).catch(error => {
          console.error("Logout during cleanup failed:", error);
        });
      }
    };
  }, [navigate]);

  //Fetch Notifications
  useEffect(() => {
    if (userId) {
      fetchNotifications();
    }
  }, [userId]);

  // Apply filters and sorting whenever tasks or filters change
  useEffect(() => {
    applyFiltersAndSorting();
  }, [assignedTasks, filters, sortConfig]);

  // Calculate user statistics whenever tasks change
  useEffect(() => {
    calculateUserStatistics();
  }, [assignedTasks]);


  const getTimeAgo = (timestamp) => {
    if (!timestamp) return 'Never';

    const date = new Date(timestamp); // ✅ already IST
    date.setHours(date.getHours() + 5);
    date.setMinutes(date.getMinutes() + 30);

    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    console.log("Notification time:", date);
    console.log("Current time:", new Date());
    console.log("Diff hours:", (new Date() - date) / (1000 * 60 * 60));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return formatLocalTime(date);
  };
  const submitMessage = async (taskId) => {
    try {
      const userId = localStorage.getItem("userId");

      if (!userId) {
        console.error("User not logged in");
        return;
      }

      await axios.post(`/api/tasks/${taskId}/messages`, {
        message: message,
        userId: userId
      });

      setMessage("");

    } catch (error) {
      console.error("Error saving message:", error);
    }
  };
  const fetchMessages = async (taskId) => {
    try {
      const response = await axios.get(`/api/tasks/${taskId}/messages`);
      setMessageHist(response.data);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };
  const fetchNotifications = async () => {
    if (!userId) return;

    setNotificationsLoading(true);
    try {
      const response = await axios.get(
        `/api/notifications/user/${userId}`
      );

      const notifications = Array.isArray(response.data) ? response.data : [];

      setNotifications(notifications);

      const unread = notifications.filter(
        n => n.status === "UNREAD"
      ).length;

      setUnreadCount(unread);

    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setNotificationsLoading(false);
    }
  };
  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);

    if (!showNotifications) {
      fetchNotifications();
    }
  };
  const markAllAsRead = async () => {
    try {
      await axios.put("/api/notifications/read-all");
      setNotifications(notifications.map(n => ({ ...n, status: 'READ' })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };
  const markAsRead = async (id) => {
    await fetch(`/api/notifications/${id}/read`, {
      method: "PUT"
    });

    fetchUserNotifications(); // refresh
  };
  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    date.setHours(date.getHours() + 5);
    date.setMinutes(date.getMinutes() + 30);
    return date.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  };

  // Toggle user menu
  const toggleUserMenu = () => {
    setShowUserMenu(!showUserMenu);
  };

  // Handle profile click
  const handleProfileClick = () => {
    navigate("/profile");
    setShowUserMenu(false);
  };
  const handleSliderChange = async (e) => {
    const newPercentage = e.target.value;
    setCompletionPercentage(newPercentage);

    if (!selectedTask?.id) return;

    try {
      await updateTaskCompletion(selectedTask.id, newPercentage);

      console.log("Task completion slider updated");
    } catch (error) {
      console.error("Error updating task completion or notifying admin", error);
    }
  };

  const updateTaskCompletion = async (taskId, percentage) => {
    try {
      await axios.put(`/api/tasks/${taskId}/update-completion`, { completionPercentage: percentage });
      console.log("Task completion slider updated successfully");
    } catch (error) {
      console.error("Error updating task completion", error);
    }
  };

  const fetchAssignedTasks = async (userId) => {
    setLoading(true);
    setError("");

    try {
      const response = await axios.get(`/api/tasks/assigned/${userId}`);
      //console.log("fetchAssignedTasks() response: ",response);
      const filtered = response.data.filter(task => task.status !== 'NEW');
      setAssignedTasks(filtered);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      if (error.response) {
        setError(`Server error: ${error.response.status}`);
        setErrorDetails(error.response.data?.error || JSON.stringify(error.response.data));
      } else if (error.request) {
        setError("Cannot connect to server");
        setErrorDetails("Please check if backend is running on http://localhost:8080");
      } else {
        setError(`Error: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Check for overdue tasks and update state if needed
  const checkOverdueTasks = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const hasOverdueChanges = assignedTasks.some(task => {
      if (task.status === 'COMPLETED') return false;
      if (!task.deadline) return false;
      const deadline = new Date(task.deadline);
      deadline.setHours(0, 0, 0, 0);
      return deadline < now;
    });

    if (hasOverdueChanges) {
      setAssignedTasks([...assignedTasks]);
    }
  };

  // Calculate user statistics
  const calculateUserStatistics = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalTasks = assignedTasks.length;
    //console.log("Total Task: " + totalTasks);
    const completedTasks = assignedTasks.filter(task => task.status === 'COMPLETED').length;
    //console.log("Completed Task: " + completedTasks);
    const inProgressTasks = assignedTasks.filter(task => task.status === 'IN_PROGRESS').length;
    //console.log("In Progress Task: " + inProgressTasks);
    const onHoldTasks = assignedTasks.filter(task => task.status === 'ON_HOLD').length;
    //console.log("On HOld Task: " + onHoldTasks);
    const pendingTasks = inProgressTasks + onHoldTasks;

    const overdueTasks = assignedTasks.filter(task => {
      if (task.status === 'COMPLETED') return false;
      if (!task.deadline) return false;
      const deadline = new Date(task.deadline);
      deadline.setHours(0, 0, 0, 0);
      return deadline < today;
    }).length;

    const tasksByPriority = {
      LOW: assignedTasks.filter(task => task.priority === 'LOW').length,
      MEDIUM: assignedTasks.filter(task => task.priority === 'MEDIUM').length,
      HIGH: assignedTasks.filter(task => task.priority === 'HIGH').length,
      CRITICAL: assignedTasks.filter(task => task.priority === 'CRITICAL').length
    };

    setUserStats({
      totalTasks,
      completedTasks,
      pendingTasks,
      overdueTasks,
      inProgressTasks,
      onHoldTasks,
      tasksByPriority
    });
  };

  // Check if a task is overdue
  const isTaskOverdue = (task) => {
    if (task.status === 'COMPLETED') return false;
    if (!task.deadline) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const deadline = new Date(task.deadline);
    deadline.setHours(0, 0, 0, 0);

    return deadline < today;
  };

  // Get days overdue
  const getDaysOverdue = (task) => {
    if (!isTaskOverdue(task)) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const deadline = new Date(task.deadline);
    deadline.setHours(0, 0, 0, 0);

    const diffTime = today - deadline;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  };

  const applyFiltersAndSorting = () => {
    let filtered = [...assignedTasks];

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(searchLower) ||
        task.description.toLowerCase().includes(searchLower)
      );
    }

    if (filters.status) {
      filtered = filtered.filter(task => task.status === filters.status);
    }

    if (filters.priority) {
      filtered = filtered.filter(task => task.priority === filters.priority);
    }

    if (filters.deadline) {
      const filterDate = new Date(filters.deadline).toDateString();
      filtered = filtered.filter(task => {
        const taskDate = task.deadline ? new Date(task.deadline).toDateString() : null;
        return taskDate === filterDate;
      });
    }

    if (filters.showOverdueOnly) {
      filtered = filtered.filter(task => isTaskOverdue(task));
    }

    const sorted = [...filtered].sort((a, b) => {
      let aValue = a[sortConfig.field];
      let bValue = b[sortConfig.field];

      if (sortConfig.field === 'deadline') {
        aValue = a.deadline ? new Date(a.deadline).getTime() : 0;
        bValue = b.deadline ? new Date(b.deadline).getTime() : 0;
      }

      if (sortConfig.field === 'priority') {
        const priorityOrder = { 'LOW': 1, 'MEDIUM': 2, 'HIGH': 3, 'CRITICAL': 4 };
        aValue = priorityOrder[a.priority] || 0;
        bValue = priorityOrder[b.priority] || 0;
      }

      if (sortConfig.field === 'status') {
        const statusOrder = { 'IN_PROGRESS': 1, 'ON_HOLD': 2, 'COMPLETED': 3 };
        aValue = statusOrder[a.status] || 0;
        bValue = statusOrder[b.status] || 0;
      }

      if (sortConfig.field === 'overdue') {
        const aOverdue = isTaskOverdue(a);
        const bOverdue = isTaskOverdue(b);
        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;
        if (aOverdue && bOverdue) {
          return getDaysOverdue(b) - getDaysOverdue(a);
        }
        return 0;
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredTasks(sorted);
  };

  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const clearFilters = () => {
    setFilters({
      status: "",
      priority: "",
      deadline: "",
      search: "",
      showOverdueOnly: false
    });
    setSortConfig({ field: "deadline", direction: "asc" });
  };

  const handleSort = (field) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleLogout = async () => {
    const userId = localStorage.getItem("userId");
    if (userId) {
      await logoutUser(userId);
    }
    localStorage.clear();
    navigate("/login", { replace: true });
    setShowUserMenu(false);
  };
  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      const response = await axios.put(`/api/tasks/${taskId}/status`, { status: newStatus });
      const updatedTask = response.data; // get backend-confirmed task

      setAssignedTasks(assignedTasks.map(task =>
        task.id === taskId ? updatedTask : task
      ));
    } catch (error) {
      console.error("Error updating task status:", error);
      setError("❌ Failed to update task status");
    }
  };

  const getPriorityClass = (priority) => {
    switch(priority?.toUpperCase()) {
      case 'LOW': return 'priority-low';
      case 'MEDIUM': return 'priority-medium';
      case 'HIGH': return 'priority-high';
      case 'CRITICAL': return 'priority-critical';
      default: return '';
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'IN_PROGRESS': return <span className="status-badge in-progress">IN PROGRESS</span>;
      case 'COMPLETED': return <span className="status-badge completed">COMPLETED</span>;
      case 'ON_HOLD': return <span className="status-badge on-hold">ON HOLD</span>;
      default: return <span className="status-badge in-progress">{status}</span>;
    }
  };

  const getSortIcon = (field) => {
    if (sortConfig.field !== field) return '↕️';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  if (loading) {
    return (
      <div className="user-dashboard">
        <header className="dashboard-header">
          <h1>MY TASKS</h1>
          {/* RIGHT SIDE */}
          <div className="header-controls">
              {/* 🔔 Notification */}
              <div className="notification-container">
  <button
    className={`notification-bell ${unreadCount > 0 ? 'has-unread' : ''}`}
    onClick={toggleNotifications}
  >
    🔔
    {unreadCount > 0 && (
      <span className="notification-badge">{unreadCount}</span>
    )}
  </button>

  {showNotifications && (
    <div className="notification-panel">
      <div className="notification-header">
        <h3>My Notifications</h3>

        <div className="notification-actions">
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="mark-read-btn">
                Mark all as read
              </button>
            )}

            <button
              onClick={() => setShowNotifications(false)}
              className="close-btn"
            >
              X
            </button>
          </div>
        </div>

        <div className="notification-list">
          {notificationsLoading ? (
            <div className="notification-loading">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="no-notifications">No notifications yet</div>
          ) : (
            notifications.map(notification => (
              <div
                key={notification.id}
                className={`notification-item ${
                  notification.status === 'UNREAD' ? 'unread' : ''
                }`}
                onClick={() => markAsRead(notification.id)}
              >
                <div className="notification-content">
                  <p className="notification-message">
                    {notification.message}
                  </p>
                  <span className="notification-time">
                    {getTimeAgo(notification.createdAt)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    )}
  </div>

              {/* 👤 Profile */}
              <div className="user-info">
                <div className="user-avatar-wrapper" ref={menuRef}>
                  <div className="user-avatar" onClick={toggleUserMenu}>
                    {UserProfilePicture ? (
                      <img src={UserProfilePicture} alt="Profile" className="avatar-image" />
                    ) : (
                      <div className="avatar-fallback">
                        {Username ? Username.charAt(0).toUpperCase() : "-"}
                      </div>
                    )}
                  </div>

                  {showUserMenu && (
                    <div className="user-dropdown">
                      <div className="user-dropdown-item" onClick={handleProfileClick}>
                        <span className="dropdown-icon">👤</span>
                        <span>My Profile</span>
                      </div>

                      <div className="user-dropdown-divider"></div>

                      <div className="user-dropdown-item logout-item" onClick={handleLogout}>
                        <span className="dropdown-icon">🚪</span>
                        <span>Logout</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
          </div>
        </header>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="user-dashboard">
      <header className="dashboard-header">
        <h1>My Tasks</h1>
        <div className="header-controls">
        <div className="notification-container">
          <button
            className={`notification-bell ${unreadCount > 0 ? 'has-unread' : ''}`}
            onClick={toggleNotifications}
          >
            🔔
            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount}</span>
            )}
          </button>

          {showNotifications && (
            <div className="notification-panel">
              <div className="notification-header">
                <h3>My Notifications</h3>

                <div className="notification-actions">
                  {unreadCount > 0 && (
                    <button onClick={markAllAsRead} className="mark-read-btn">
                      Mark all as read
                    </button>
                  )}

                  <button
                    onClick={() => setShowNotifications(false)}
                    className="close-btn"
                  >
                    X
                  </button>
                </div>
              </div>

              <div className="notification-list">
                {notificationsLoading ? (
                  <div className="notification-loading">Loading...</div>
                ) : notifications.length === 0 ? (
                  <div className="no-notifications">No notifications yet</div>
                ) : (
                  notifications.map(notification => (
                    <div
                      key={notification.id}
                      className={`notification-item ${
                        notification.status === 'UNREAD' ? 'unread' : ''
                      }`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="notification-content">
                        <p className="notification-message">
                          {notification.message}
                        </p>
                        <span className="notification-time">
                          {getTimeAgo(notification.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        <div className="user-info">
          <div className="user-avatar-wrapper" ref={menuRef}>
            <div className="user-avatar" onClick={toggleUserMenu}>
            <img
              src={UserProfilePicture || "/default-avatar.png"}
              alt="Profile"
              className="avatar-image"
              onError={(e) => {
                e.target.src = "/default-avatar.png";
              }}
            />
            </div>
            {showUserMenu && (
              <div className="user-dropdown">
                <div className="user-dropdown-item" onClick={handleProfileClick}>
                  <span className="dropdown-icon">👤</span>
                  <span>My Profile</span>
                </div>
                <div className="user-dropdown-divider"></div>
                <div className="user-dropdown-item logout-item" onClick={handleLogout}>
                  <span className="dropdown-icon">🚪</span>
                  <span>Logout</span>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      </header>

      {error && (
        <div className="error-container">
          <div className="error-message">
            <strong>❌ {error}</strong>
            {errorDetails && <p className="error-details">{errorDetails}</p>}
          </div>
          <button onClick={() => fetchAssignedTasks(userInfo.id)} className="retry-btn">
            Retry
          </button>
        </div>
      )}

      {/* User Statistics Dashboard */}
      {showStatistics && (
        <div className="user-statistics-dashboard">
          <h2>Tasks Overview</h2>

          <div className="user-stats-grid">
            <div className="user-stat-card total">
              <div className="stat-icon">📊</div>
              <div className="stat-content">
                <span className="stat-label">My Total Tasks</span>
                <span className="stat-value">{userStats.totalTasks}</span>
              </div>
            </div>

            <div className="user-stat-card completed">
              <div className="stat-icon-checkmark"></div>
              <div className="stat-content">
                <span className="stat-label">Completed</span>
                <span className="stat-value">{userStats.completedTasks}</span>
              </div>
            </div>

            <div className="user-stat-card pending">
              <div className="stat-icon">⏳</div>
              <div className="stat-content">
                <span className="stat-label">Pending</span>
                <span className="stat-value">{userStats.pendingTasks}</span>
              </div>
            </div>

            <div className="user-stat-card overdue">
              <div className="stat-icon">⚠️</div>
              <div className="stat-content">
                <span className="stat-label">Overdue</span>
                <span className="stat-value">{userStats.overdueTasks}</span>
              </div>
            </div>
          </div>

          <div className="user-stats-details">
            <div className="stats-detail-card">
              <h3>Task Status Breakdown</h3>
              <div className="status-breakdown">
                <div className="breakdown-item">
                  <span className="status-label">In Progress:</span>
                  <span className="status-value">{userStats.inProgressTasks}</span>
                </div>
                <div className="breakdown-item">
                  <span className="status-label">On Hold:</span>
                  <span className="status-value">{userStats.onHoldTasks}</span>
                </div>
                <div className="breakdown-item">
                  <span className="status-label">Completed:</span>
                  <span className="status-value">{userStats.completedTasks}</span>
                </div>
              </div>
            </div>

            <div className="stats-detail-card">
              <h3>Priority Distribution</h3>
              <div className="priority-distribution">
                {Object.entries(userStats.tasksByPriority).map(([priority, count]) => (
                  <div key={priority} className="priority-item">
                    <span className={`priority-dot ${priority.toLowerCase()}`}></span>
                    <span className="status-label">{priority}</span>
                    <span className="priority-value">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="stats-detail-card">
              <h3>Overall Progress</h3>
              <div className="progress-container">
                <div className="progress-info">
                  <span>Completed</span>
                  <span>{Math.round((userStats.completedTasks / (userStats.totalTasks || 1)) * 100)}%</span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${(userStats.completedTasks / (userStats.totalTasks || 1)) * 100}%` }}
                  ></div>
                </div>
                <div className="progress-stats">
                  <span>{userStats.completedTasks} of {userStats.totalTasks} tasks</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="tasks-container">
        <div className="filters-section user-filters">
          <h3>Filter Tasks</h3>
          <div className="filters-grid">
            <div className="filter-group">
              <label>Search:</label>
              <input
                type="text"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="Search by title or description"
                className="search-input"
              />
            </div>

            <div className="filter-group">
              <label>Status:</label>
              <select name="status" value={filters.status} onChange={handleFilterChange}>
                <option value="">All Status</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Priority:</label>
              <select name="priority" value={filters.priority} onChange={handleFilterChange}>
                <option value="">All Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Deadline:</label>
              <input
                type="date"
                name="deadline"
                value={filters.deadline}
                onChange={handleFilterChange}
              />
            </div>

            <div className="filter-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="showOverdueOnly"
                  checked={filters.showOverdueOnly}
                  onChange={handleFilterChange}
                />
                Show overdue only
              </label>
            </div>

            <div className="filter-actions">
              <button onClick={clearFilters} className="clear-filters-btn">
                Clear Filters
              </button>
            </div>
          </div>

          <div className="sorting-controls">
            <span className="sort-label">Sort by:</span>
            <button
              className={`sort-btn ${sortConfig.field === 'title' ? 'active' : ''}`}
              onClick={() => handleSort('title')}
            >
              Title {getSortIcon('title')}
            </button>
            <button
              className={`sort-btn ${sortConfig.field === 'status' ? 'active' : ''}`}
              onClick={() => handleSort('status')}
            >
              Status {getSortIcon('status')}
            </button>
            <button
              className={`sort-btn ${sortConfig.field === 'priority' ? 'active' : ''}`}
              onClick={() => handleSort('priority')}
            >
              Priority {getSortIcon('priority')}
            </button>
            <button
              className={`sort-btn ${sortConfig.field === 'deadline' ? 'active' : ''}`}
              onClick={() => handleSort('deadline')}
            >
              Deadline {getSortIcon('deadline')}
            </button>
            <button
              className={`sort-btn ${sortConfig.field === 'overdue' ? 'active' : ''}`}
              onClick={() => handleSort('overdue')}
            >
              Overdue {getSortIcon('overdue')}
            </button>
          </div>
        </div>

        {filteredTasks.length === 0 ? (
          <div className="no-tasks">
            <h2 className="user-statistics-dashboard__title">No tasks found</h2>
            {assignedTasks.length > 0 ? (
              <p>No tasks match your filters. <button onClick={clearFilters} className="clear-filters-link">Clear filters</button></p>
            ) : (
              <p>Your admin will assign tasks to you soon</p>
            )}
          </div>
        ) : (
          <>
          <h2 className="user-statistics-dashboard">My Tasks: </h2>
          <div className="user-tasks-grid">
            {filteredTasks.map(task => {
              const isOverdue = isTaskOverdue(task);
              const daysOverdue = getDaysOverdue(task);

              return (
                <div
                  key={task.id}
                  className={`task-card ${getPriorityClass(task.priority)} ${isOverdue ? 'overdue-task' : ''}`}
                  onClick={() => {
                    setSelectedTask(task);
                    setShowDetails(true);
                  }}
                >
                  {/* {isOverdue && (
                    <div className="overdue-badge">
                      ⚠️ {daysOverdue} {daysOverdue === 1 ? 'day' : 'days'} overdue
                    </div>
                  )} */}
                  <div className="task-header">
                    <h3 title={task.title}>{task.title}</h3>
                    {getStatusBadge(task.status)}
                  </div>
                  <p className="task-description" title={task.description}>
                    {task.description}
                  </p>
                  <div className="task-meta">
                    <span className="task-priority">Priority: <div className="priority-badge critical">{task.priority}</div></span>
                    <span>Due:</span>
                    <div className="view-tasks-btn">{task.deadline ? new Date(task.deadline).toLocaleDateString('en-GB') : 'No deadline'}</div>
                  </div>
                  <span className="overdue-warning">{isOverdue && ` (${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue)`}</span>
                  {/* ✅ Progress Bar */}
                  <div className="task-progress-bar">
                    <div
                      className="task-progress-fill"
                      style={{ width: `${task.completionPercentage || 0}%` }}
                    ></div>
                    <span className="progress-text">
                      {task.completionPercentage || 0}%
                    </span>
                   </div>
                </div>
              );
            })}
          </div>
          </>
        )}
      </div>

      {showDetails && selectedTask && (
        <div className="modal-overlay" onClick={() => setShowDetails(false)}>
          <div className="modal task-details-modal" onClick={e => e.stopPropagation()}>
            <h2>{selectedTask.title}</h2>

            <div className="detail-row">
              <label>Description:</label>
              <h4>{selectedTask.description || 'No description'}</h4>
            </div>

            <div className="detail-row">
              <label>Priority:</label>
              <span className={`priority-badge critical`}>
                {selectedTask.priority}
              </span>
            </div>

            <div className="detail-row">
              <label>Deadline:</label>
              <span className={isTaskOverdue(selectedTask) ? 'overdue-text' : ''}>
                {selectedTask.deadline
                  ? new Date(selectedTask.deadline).toLocaleDateString('en-GB')
                  : 'No deadline'}
                {isTaskOverdue(selectedTask) &&
                  <span className="overdue-warning">
                    {' '}({getDaysOverdue(selectedTask)} days overdue)
                  </span>
                }
              </span>
            </div>
            <div className="form-group">
              <div className="assign-modal">
              <h4>Status:</h4>
              <select
                value={selectedTask.status}
                onChange={(e) => {
                  updateTaskStatus(selectedTask.id, e.target.value);
                  setSelectedTask({...selectedTask, status: e.target.value});
                }}
                className="custom-dropdown"
              >
                <option value="IN_PROGRESS" className="status-badge-c-dd in-progress">IN_PROGRESS</option>
                <option value="ON_HOLD" className="status-badge-c-dd on-hold">ON_HOLD</option>
                <option value="COMPLETED" className="status-badge-c-dd completed">COMPLETED</option>
              </select>
            </div>
          </div>
        <div className="detail-row">
          <label>Task Progress: </label>
          <div className="slider-container">
            <input
              type="range"
              min="0"
              max="100"
              value={completionPercentage}
              onChange={handleSliderChange}
              className="completion-slider"
              style={{
                "--value": completionPercentage
              }}
            />
            <span className="slider-value">{completionPercentage}%</span>
          </div>
            <div class="detail-row"><label>UPDATE MESSAGE:</label></div>
              <div class="form-group">
                <textarea rows="3" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Enter Update Details for the Task"></textarea>
                <div className="submit-btn" onClick={() => submitMessage(selectedTask.id)}>SUBMIT</div>
              </div>
              <button className="msg-std-btn" onClick={() => {fetchMessages(selectedTask.id); setShowMessageHistory(true)}}>SHOW MESSAGE HISTORY</button>
            </div>
            <br></br>
            <br></br>
          {isTaskOverdue(selectedTask) && selectedTask.status !== 'COMPLETED' && (
            <div className="overdue-notice">
              <strong>⚠️ This task is overdue!</strong>
              <p>Please complete it as soon as possible.</p>
            </div>
          )}
          <button className="user-close-btn" onClick={() => setShowDetails(false)}>X</button>
          </div>
        </div>
      )}
      {showMessageHistory && (
        <div className="modal-overlay" onClick={() => setShowMessageHistory(false)}>
          <div className="modal task-details-modal" onClick={e => e.stopPropagation()}>
            <h2>Message History:</h2>
            <div>
              {messageHist.length === 0 ? (
                <p>No messages found</p>
              ) : (
                messageHist.map((msg, index) => (
                  <p key={msg.id} className="message-row">
                  <span className="msg-header">
                    [{formatDateTime(msg.createdAt)}] [{msg.username}]:
                  </span>{" "}
                  <span className="msg-text">
                    {msg.message}
                  </span>
                </p>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserDashboard;