import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from './axiosConfig.js';
import "./UserDashboard.css";
// Import heartbeat functions only once
import { startHeartbeat, stopHeartbeat, logoutUser } from './heartbeatService';

axios.defaults.headers.common['Content-Type'] = 'application/json';

function UserDashboard() {
  const navigate = useNavigate();
  const [assignedTasks, setAssignedTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [errorDetails, setErrorDetails] = useState("");
  const [selectedTask, setSelectedTask] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [userInfo, setUserInfo] = useState({ id: null, username: "", email: "", role: "" });
  
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
    const role = localStorage.getItem("role");
    const userId = localStorage.getItem("userId");
    const username = localStorage.getItem("username");
    const userEmail = localStorage.getItem("userEmail");

    setUserInfo({ id: userId, username, email: userEmail, role });

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    if (role !== "USER") {
      navigate("/admin", { replace: true });
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

  // Apply filters and sorting whenever tasks or filters change
  useEffect(() => {
    applyFiltersAndSorting();
  }, [assignedTasks, filters, sortConfig]);

  // Calculate user statistics whenever tasks change
  useEffect(() => {
    calculateUserStatistics();
  }, [assignedTasks]);

  // Toggle user menu
  const toggleUserMenu = () => {
    setShowUserMenu(!showUserMenu);
  };

  // Handle profile click
  const handleProfileClick = () => {
    navigate("/profile");
    setShowUserMenu(false);
  };

  const fetchAssignedTasks = async (userId) => {
    setLoading(true);
    setError("");
    
    try {
      const response = await axios.get(`/api/tasks/assigned/${userId}`);
      const filtered = response.data.filter(task => task.status !== 'NEW');
      setAssignedTasks(filtered);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      if (error.response) {
        setError(`Server error: ${error.response.status}`);
        setErrorDetails(error.response.data?.error || JSON.stringify(error.response.data));
      } else if (error.request) {
        setError("Cannot connect to server");
        setErrorDetails("Please check if backend is running on http://localhost:8081");
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
    const completedTasks = assignedTasks.filter(task => task.status === 'COMPLETED').length;
    const inProgressTasks = assignedTasks.filter(task => task.status === 'IN_PROGRESS').length;
    const onHoldTasks = assignedTasks.filter(task => task.status === 'ON_HOLD').length;
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
      await axios.put(`/api/tasks/${taskId}`, { status: newStatus });
      setAssignedTasks(assignedTasks.map(task => 
        task.id === taskId ? { ...task, status: newStatus } : task
      ));
    } catch (error) {
      setError("Failed to update task status");
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
      case 'IN_PROGRESS': return <span className="status-badge in-progress">In Progress</span>;
      case 'COMPLETED': return <span className="status-badge completed">Completed</span>;
      case 'ON_HOLD': return <span className="status-badge on-hold">On Hold</span>;
      default: return <span className="status-badge new">{status}</span>;
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
          <h1>My Tasks</h1>
          <div className="user-info">
            <div className="user-avatar-wrapper" ref={menuRef}>
              <div className="user-avatar" onClick={toggleUserMenu}>
                <div className="avatar-initials">
                  {userInfo.username ? userInfo.username.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="avatar-status online"></div>
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
        <div className="user-info">
          <div className="user-avatar-wrapper" ref={menuRef}>
            <div className="user-avatar" onClick={toggleUserMenu}>
              <div className="avatar-initials">
                {userInfo.username ? userInfo.username.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="avatar-status online"></div>
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
          <h2>My Dashboard Overview</h2>
          
          <div className="user-stats-grid">
            <div className="user-stat-card total">
              <div className="stat-icon">📊</div>
              <div className="stat-content">
                <span className="stat-label">My Total Tasks</span>
                <span className="stat-value">{userStats.totalTasks}</span>
              </div>
            </div>
            
            <div className="user-stat-card completed">
              <div className="stat-icon">✅</div>
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
                    <span className="priority-label">{priority}</span>
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
            <h2>No tasks found</h2>
            {assignedTasks.length > 0 ? (
              <p>No tasks match your filters. <button onClick={clearFilters} className="clear-filters-link">Clear filters</button></p>
            ) : (
              <p>Your admin will assign tasks to you soon</p>
            )}
          </div>
        ) : (
          <div className="tasks-grid">
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
                  {isOverdue && (
                    <div className="overdue-badge">
                      ⚠️ {daysOverdue} {daysOverdue === 1 ? 'day' : 'days'} overdue
                    </div>
                  )}
                  <div className="task-header">
                    <h3 title={task.title}>{task.title}</h3>
                    {getStatusBadge(task.status)}
                  </div>
                  <p className="task-description" title={task.description}>
                    {task.description}
                  </p>
                  <div className="task-meta">
                    <span className="task-priority">Priority: {task.priority}</span>
                    <span className={`task-deadline ${isOverdue ? 'overdue-text' : ''}`}>
                      Due: {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No deadline'}
                      {isOverdue && ` (${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue)`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showDetails && selectedTask && (
        <div className="modal-overlay" onClick={() => setShowDetails(false)}>
          <div className="modal task-details-modal" onClick={e => e.stopPropagation()}>
            <h2>{selectedTask.title}</h2>
            
            <div className="detail-row">
              <label>Description:</label>
              <p>{selectedTask.description || 'No description'}</p>
            </div>
            
            <div className="detail-row">
              <label>Priority:</label>
              <span className={`priority-badge ${selectedTask.priority?.toLowerCase()}`}>
                {selectedTask.priority}
              </span>
            </div>
            
            <div className="detail-row">
              <label>Deadline:</label>
              <span className={isTaskOverdue(selectedTask) ? 'overdue-text' : ''}>
                {selectedTask.deadline 
                  ? new Date(selectedTask.deadline).toLocaleDateString() 
                  : 'No deadline'}
                {isTaskOverdue(selectedTask) && 
                  <span className="overdue-warning">
                    {' '}({getDaysOverdue(selectedTask)} days overdue)
                  </span>
                }
              </span>
            </div>
            
            <div className="detail-row">
              <label>Status:</label>
              <select
                value={selectedTask.status}
                onChange={(e) => {
                  updateTaskStatus(selectedTask.id, e.target.value);
                  setSelectedTask({...selectedTask, status: e.target.value});
                }}
                className="status-select"
              >
                <option value="IN_PROGRESS">In Progress</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
            
            {isTaskOverdue(selectedTask) && selectedTask.status !== 'COMPLETED' && (
              <div className="overdue-notice">
                <strong>⚠️ This task is overdue!</strong>
                <p>Please complete it as soon as possible.</p>
              </div>
            )}
            
            <button className="close-btn" onClick={() => setShowDetails(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserDashboard;