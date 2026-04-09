import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from './axiosConfig.js';
import "./AdminDashboard.css";
import { Axios } from "axios";
import axiosInstance from "./axiosConfig.js";

// Configure axios defaults
axios.defaults.headers.common['Content-Type'] = 'application/json';
axios.defaults.withCredentials = true;

function AdminDashboard() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const getProfileImage = (profilePicture) => {
    const base = axios.defaults.baseURL.replace(/\/+$/, ""); // remove trailing slash
    const path = profilePicture
      ? profilePicture.replace(/^\/+/, "") // remove leading slash
      : "uploads/profile_pictures/default.png";

    return `${base}/${path}`;
  };
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // ============== PARTICLE BACKGROUND ANIMATION ==============
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

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
        ctx.fillStyle = `rgba(102, 126, 234, ${particle.opacity})`;
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

    resizeCanvas();
    createParticles();
    drawParticles();

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

  // ============== STATE DECLARATIONS ==============
  const [unassignedTasks, setUnassignedTasks] = useState([]);
  const [assignedTasks, setAssignedTasks] = useState([]);
  const [filteredUnassignedTasks, setFilteredUnassignedTasks] = useState([]);
  const [filteredAssignedTasks, setFilteredAssignedTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [lastHeartbeatTime, setLastHeartbeatTime] = useState({});
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [userStatuses, setUserStatuses] = useState({});

  const [statistics, setStatistics] = useState({
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    overdueTasks: 0,
    tasksPerUser: [],
    tasksByPriority: {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0
    },
    tasksByStatus: {
      NEW: 0,
      IN_PROGRESS: 0,
      ON_HOLD: 0,
      COMPLETED: 0
    }
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [errorDetails, setErrorDetails] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [activeTab, setActiveTab] = useState("unassigned");
  const [backendStatus, setBackendStatus] = useState("checking");
  const [showStatistics, setShowStatistics] = useState(true);

  const [hoveredUser, setHoveredUser] = useState(null);
  const [showUserPopup, setShowUserPopup] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef(null);
  const hoverTimeout = React.useRef(null);
  const leaveTimeout = React.useRef(null);

  const [filters, setFilters] = useState({
    status: "",
    priority: "",
    deadline: "",
    search: ""
  });

  const [sortConfig, setSortConfig] = useState({
    field: "deadline",
    direction: "asc"
  });

  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
    deadline: ""
  });

  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    task: null
  });

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTaskForAssign, setSelectedTaskForAssign] = useState(null);

  const [showReassignModal, setShowReassignModal] = useState(false);
  const [selectedTaskForReassign, setSelectedTaskForReassign] = useState(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);

  const [showTaskDetails, setShowTaskDetails] = useState(false);
  const [selectedTaskDetails, setSelectedTaskDetails] = useState(null);

  const [showUnassignConfirm, setShowUnassignConfirm] = useState(false);
  const [taskToUnassign, setTaskToUnassign] = useState(null);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  const [showUserTasksModal, setShowUserTasksModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userTasks, setUserTasks] = useState([]);

  const adminUserId = localStorage.getItem("userId");
  const adminUsername = localStorage.getItem("username");
  const adminProfilePicture = localStorage.getItem("profilePicture");
  // ============== TIME FORMATTING FUNCTIONS ==============
  const formatLocalTime = (date) => {
    const options = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata'
    };
    return date.toLocaleString('en-IN', options);
  };

  const getTimeAgo = (utcTimestamp) => {
    if (!utcTimestamp) return 'Never';
    const dateUTC = new Date(utcTimestamp);
    const dateIST = new Date(dateUTC.getTime() + 5.5 * 60 * 60 * 1000);
    const nowUTC = new Date();
    const nowIST = new Date(nowUTC.getTime() + 5.5 * 60 * 60 * 1000);
    const diffMs = nowIST.getTime() - dateIST.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return formatLocalTime(dateIST);
  };

  // ============== API FUNCTIONS ==============
  const sendAdminHeartbeat = async () => {
    if (!adminUserId) return;
    try {
      await axios.post(`/api/activity/heartbeat?userId=${adminUserId}`);
      console.log(`💓 Admin heartbeat sent at ${new Date().toLocaleTimeString()}`);
    } catch (error) {
      console.error("Admin heartbeat failed:", error);
    }
  };

  const checkBackendStatus = async () => {
    try {
      const response = await axios.get("/", { timeout: 5000 });
      setBackendStatus("online");
      fetchAllData();
      fetchUnreadCount();
      fetchAllUserStatuses();
    } catch (error) {
      setBackendStatus("offline");
      setError("Cannot connect to backend server");
      setErrorDetails(`Make sure backend is running`);
      setLoading(false);
    }
  };
  const fetchAllData = async () => {
    setLoading(true);
    setError("");

    try {
      const unassignedRes = await axios.get("/api/tasks/unassigned");
      setUnassignedTasks(Array.isArray(unassignedRes.data) ? unassignedRes.data : []);

      const allTasksRes = await axios.get("/api/tasks");
      const allTasks = Array.isArray(allTasksRes.data) ? allTasksRes.data : [];
      const assigned = allTasks.filter(task => task.status !== 'NEW');
      setAssignedTasks(assigned);

      const usersRes = await axios.get("/api/users/assignable");
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);

    } catch (error) {
      handleApiError(error, "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUserStatuses = async () => {
    try {
      const response = await axios.get("/api/activity/all-status");
      const statusMap = {};
      let onlineCount = 0;

      response.data.forEach(status => {
        statusMap[status.userId] = status;
        if (status.isOnline) onlineCount++;
      });

      setUserStatuses({ ...statusMap });
      setLastUpdate(Date.now());
    } catch (error) {
      console.error("Error fetching user statuses:", error);
    }
  };

  const fetchUserStatus = async (userId) => {
    try {
      const response = await axios.get(`/api/activity/user-status/${userId}`);
      setUserStatuses(prev => ({
        ...prev,
        [userId]: response.data
      }));
      return response.data;
    } catch (error) {
      console.error("Error fetching user status:", error);
      return null;
    }
  };

  // ============== UI HANDLERS ==============
  const handleUserHover = (event, user) => {
    if (!user || !user.username || !user.lastActivity) return;

    const now = new Date();
    const lastActivityDate = new Date(user.lastActivity);
    const diffInMs = now.getTime() - lastActivityDate.getTime();
    const lastActivityLocalTime = new Date(now.getTime() - diffInMs);
    const formattedLastActivityTime = formatLocalTime(lastActivityLocalTime);

    setHoveredUser({ ...user, formattedLastActivityTime });

    const rect = event.target.getBoundingClientRect();
    setPopupPosition({
      x: rect.left,
      y: rect.top - 10,
    });

    setShowUserPopup(true);
  };

  const handleUserLeave = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    leaveTimeout.current = setTimeout(() => {
      setShowUserPopup(false);
      setHoveredUser(null);
    }, 500);
  };

  const handlePopupMouseEnter = () => {
    if (leaveTimeout.current) clearTimeout(leaveTimeout.current);
  };

  const handlePopupMouseLeave = () => {
    leaveTimeout.current = setTimeout(() => {
      setShowUserPopup(false);
      setHoveredUser(null);
    }, 300);
  };

  const handleApiError = (error, defaultMessage) => {
    if (error.response) {
      setError(error.response.data?.error || defaultMessage);
      setErrorDetails(JSON.stringify(error.response.data));
    } else if (error.request) {
      setError("Cannot connect to server");
      setErrorDetails("Please check if backend is running");
    } else {
      setError(defaultMessage);
      setErrorDetails(error.message);
    }
  };

  // ============== STATISTICS ==============
  const calculateStatistics = () => {
    const allTasks = [...unassignedTasks, ...assignedTasks];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter(task => task.status === 'COMPLETED').length;
    const pendingTasks = allTasks.filter(task =>   task.status === 'NEW' || task.status === 'IN_PROGRESS' || task.status === 'ON_HOLD'
    ).length;

    const overdueTasks = allTasks.filter(task => {
      if (task.status === 'COMPLETED') return false;
      if (!task.deadline) return false;
      const deadline = new Date(task.deadline);
      deadline.setHours(0, 0, 0, 0);
      return deadline < today;
    }).length;

    const tasksByPriority = {
      LOW: allTasks.filter(task => task.priority === 'LOW').length,
      MEDIUM: allTasks.filter(task => task.priority === 'MEDIUM').length,
      HIGH: allTasks.filter(task => task.priority === 'HIGH').length,
      CRITICAL: allTasks.filter(task => task.priority === 'CRITICAL').length
    };

    const tasksByStatus = {
      NEW: unassignedTasks.length,
      IN_PROGRESS: assignedTasks.filter(task => task.status === 'IN_PROGRESS').length,
      ON_HOLD: assignedTasks.filter(task => task.status === 'ON_HOLD').length,
      COMPLETED: assignedTasks.filter(task => task.status === 'COMPLETED').length
    };

    const tasksPerUser = users.map(user => {
      const userAssignedTasks = assignedTasks.filter(task => task.assignedUser && task.assignedUser.id === user.id
      );
      const userStatus = userStatuses[user.id] || {
        isOnline: false,
        lastLogin: null,
        lastActivity: null
      };

      return {
        userId: user.id,
        username: user.username,
        email: user.email,
        totalTasks: userAssignedTasks.length,
        inProgress: userAssignedTasks.filter(t => t.status === 'IN_PROGRESS').length,
        onHold: userAssignedTasks.filter(t => t.status === 'ON_HOLD').length,
        completed: userAssignedTasks.filter(t => t.status === 'COMPLETED').length,
        tasks: userAssignedTasks,
        isOnline: userStatus.isOnline || false,
        lastLogin: userStatus.lastLogin,
        lastActivity: userStatus.lastActivity
      };
    }).sort((a, b) => b.totalTasks - a.totalTasks);

    setStatistics({
      totalTasks,
      completedTasks,
      pendingTasks,
      overdueTasks,
      tasksPerUser,
      tasksByPriority,
      tasksByStatus
    });
  };

  const viewUserTasks = (user) => {
    setSelectedUser(user);
    setUserTasks(user.tasks || []);
    setShowUserTasksModal(true);
  };

  // ============== FILTERS & SORTING ==============
  const applyFiltersAndSorting = () => {
    let filteredUnassigned = [...unassignedTasks];
    let filteredAssigned = [...assignedTasks];

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredUnassigned = filteredUnassigned.filter(task =>
        task.title.toLowerCase().includes(searchLower) ||
        task.description.toLowerCase().includes(searchLower)
      );
      filteredAssigned = filteredAssigned.filter(task =>
        task.title.toLowerCase().includes(searchLower) ||
        task.description.toLowerCase().includes(searchLower)
      );
    }

    if (filters.status) {
      filteredUnassigned = filteredUnassigned.filter(task => task.status === filters.status);
      filteredAssigned = filteredAssigned.filter(task => task.status === filters.status);
    }

    if (filters.priority) {
      filteredUnassigned = filteredUnassigned.filter(task => task.priority === filters.priority);
      filteredAssigned = filteredAssigned.filter(task => task.priority === filters.priority);
    }

    if (filters.deadline) {
      const filterDate = new Date(filters.deadline).toDateString();
      filteredUnassigned = filteredUnassigned.filter(task => {
        const taskDate = task.deadline ? new Date(task.deadline).toDateString() : null;
        return taskDate === filterDate;
      });
      filteredAssigned = filteredAssigned.filter(task => {
        const taskDate = task.deadline ? new Date(task.deadline).toDateString() : null;
        return taskDate === filterDate;
      });
    }

    const sortTasks = (tasks) => {
      return [...tasks].sort((a, b) => {
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
          const statusOrder = { 'NEW': 1, 'IN_PROGRESS': 2, 'ON_HOLD': 3, 'COMPLETED': 4 };
          aValue = statusOrder[a.status] || 0;
          bValue = statusOrder[b.status] || 0;
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    };

    setFilteredUnassignedTasks(sortTasks(filteredUnassigned));
    setFilteredAssignedTasks(sortTasks(filteredAssigned));
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setFilters({
      status: "",
      priority: "",
      deadline: "",
      search: ""
    });
    setSortConfig({ field: "deadline", direction: "asc" });
  };

  const handleSort = (field) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // ============== NOTIFICATIONS ==============
  const fetchNotifications = async () => {
    setNotificationsLoading(true);

    try {
      const response = await axios.get("/api/notifications");
      // ✅ Filter admin notifications correctly
      const adminNotifications = response.data.filter(
        n => n.user?.id === adminUserId
      );

      setNotifications(adminNotifications);

      // ✅ Correct unread count
      const unread = adminNotifications.filter(
        n => n.status === "UNREAD"
      ).length;

      setUnreadCount(unread);

    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await axios.get("/api/notifications/unread/count");
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  };

  const markAsRead = async (id) => {
    try {
      await axios.put(`/api/notifications/${id}/read`);

      // ✅ Update state instead of refetching
      setNotifications(prev =>
        prev.map(n =>
          n.id === id ? { ...n, status: "READ" } : n
        )
      );

    } catch (error) {
      console.error("Error marking as read:", error);
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

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications) {
      fetchNotifications();
    }
  };

  const formatNotificationTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMins = Math.floor((now - date) / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hour${Math.floor(diffMins / 60) > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  // ============== TASK ACTIONS ==============
  const handleCreateTask = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await axios.post("/api/tasks", newTask);
      setUnassignedTasks([...unassignedTasks, response.data]);

      setNewTask({
        title: "",
        description: "",
        priority: "MEDIUM",
        deadline: ""
      });

      setSuccessMessage("Task created successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
      fetchUnreadCount();

    } catch (error) {
      handleApiError(error, "Failed to create task");
    } finally {
      setLoading(false);
    }
  };

  const handleContextMenu = (e, task) => {
    e.preventDefault();
    e.stopPropagation();

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const menuWidth = 200;
    const menuHeight = 180;

    let x = e.pageX;
    let y = e.pageY;

    if (x + menuWidth > viewportWidth) x = viewportWidth - menuWidth - 10;
    if (y + menuHeight > viewportHeight) y = viewportHeight - menuHeight - 10;

    setContextMenu({ visible: true, x, y, task });
  };

  const handleTaskClick = (task) => {
    setSelectedTaskDetails(task);
    setShowTaskDetails(true);
  };

  const closeContextMenu = () => {
    setContextMenu({ ...contextMenu, visible: false });
  };

  const handleAssignTask = (task) => {
    setSelectedTaskForAssign(task);
    setShowAssignModal(true);
    closeContextMenu();
  };

  const handleReassignTask = (task) => {
    setSelectedTaskForReassign(task);
    setShowReassignModal(true);
    closeContextMenu();
  };

  const handleUnassignTask = (task) => {
    setTaskToUnassign(task);
    setShowUnassignConfirm(true);
    closeContextMenu();
  };

  const confirmUnassign = async () => {
    if (!taskToUnassign) return;

    setLoading(true);
    try {
      const response = await axios.put(`/api/tasks/${taskToUnassign.id}/unassign`);
      setAssignedTasks(assignedTasks.filter(t => t.id !== taskToUnassign.id));
      setUnassignedTasks([...unassignedTasks, response.data]);
      setSuccessMessage("Task moved back to unassigned queue!");
      setTimeout(() => setSuccessMessage(""), 3000);
      fetchUnreadCount();
    } catch (error) {
      handleApiError(error, "Failed to unassign task");
    } finally {
      setLoading(false);
      setShowUnassignConfirm(false);
      setTaskToUnassign(null);
    }
  };

  const confirmAssignment = async (userId) => {
    if (!selectedTaskForAssign) return;

    setLoading(true);
    try {
      const response = await axios.put(`/api/tasks/${selectedTaskForAssign.id}/assign/${userId}`);
      setUnassignedTasks(unassignedTasks.filter(t => t.id !== selectedTaskForAssign.id));
      const assignedTask = response.data;
      const assignedUser = users.find(u => u.id === userId);
      if (assignedUser) assignedTask.assignedUser = assignedUser;
      setAssignedTasks([...assignedTasks, assignedTask]);
      const usersRes = await axios.get("/api/users/assignable");
      setUsers(usersRes.data);
      setSuccessMessage(`Task assigned successfully!`);
      setTimeout(() => setSuccessMessage(""), 3000);
      fetchUnreadCount();
    } catch (error) {
      handleApiError(error, "Failed to assign task");
    } finally {
      setLoading(false);
      setShowAssignModal(false);
      setSelectedTaskForAssign(null);
    }
  };

  const confirmReassignment = async (userId) => {
    if (!selectedTaskForReassign) return;

    setLoading(true);
    try {
      const response = await axios.put(`/api/tasks/${selectedTaskForReassign.id}/assign/${userId}`);
      const updatedTask = response.data;
      const newUser = users.find(u => u.id === userId);
      if (newUser) updatedTask.assignedUser = newUser;
      setAssignedTasks(assignedTasks.map(t =>
        t.id === selectedTaskForReassign.id ? updatedTask : t
      ));
      setSuccessMessage(`Task reassigned successfully!`);
      setTimeout(() => setSuccessMessage(""), 3000);
      fetchUnreadCount();
    } catch (error) {
      handleApiError(error, "Failed to reassign task");
    } finally {
      setLoading(false);
      setShowReassignModal(false);
      setSelectedTaskForReassign(null);
    }
  };

  const handleEditTask = (task) => {
    setEditingTask({ ...task });
    setShowEditModal(true);
    closeContextMenu();
  };

  const saveEditedTask = async () => {
    if (!editingTask) return;

    setLoading(true);
    try {
      const response = await axios.put(`/api/tasks/${editingTask.id}`, editingTask);
      if (editingTask.status === "NEW") {
        setUnassignedTasks(unassignedTasks.map(t =>
          t.id === editingTask.id ? response.data : t
        ));
      } else {
        setAssignedTasks(assignedTasks.map(t =>
          t.id === editingTask.id ? response.data : t
        ));
      }
      setSuccessMessage("Task updated successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
      fetchUnreadCount();
    } catch (error) {
      handleApiError(error, "Failed to update task");
    } finally {
      setLoading(false);
      setShowEditModal(false);
      setEditingTask(null);
    }
  };

  const handleDeleteTask = (task) => {
    setTaskToDelete(task);
    setShowDeleteConfirm(true);
    closeContextMenu();
  };

  const confirmDelete = async () => {
    if (!taskToDelete) return;

    setLoading(true);
    try {
      await axios.delete(`/api/tasks/${taskToDelete.id}`);
      if (taskToDelete.status === "NEW") {
        setUnassignedTasks(unassignedTasks.filter(t => t.id !== taskToDelete.id));
      } else {
        setAssignedTasks(assignedTasks.filter(t => t.id !== taskToDelete.id));
      }
      setSuccessMessage("Task deleted successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
      fetchUnreadCount();
    } catch (error) {
      handleApiError(error, "Failed to delete task");
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
      setTaskToDelete(null);
    }
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
  const handleLogout = async () => {
    const userId = localStorage.getItem("userId");
    if (userId) {
      try {
        await axios.post(`/api/activity/logout?userId=${userId}`);
        console.log("✅ Logout successful");
        setTimeout(() => fetchAllUserStatuses(), 500);
      } catch (error) {
        console.error("Logout failed:", error);
      }
    }
    setUserStatuses({});
    setUsers([]);
    setUnassignedTasks([]);
    setAssignedTasks([]);
    localStorage.clear();
    navigate("/login", { replace: true });
    setShowUserMenu(false);
  };

  // ============== HELPER FUNCTIONS ==============
  const getUserName = (userId) => {
    if (!userId) return 'Unassigned';
    const user = users.find(u => u.id === userId);
    return user ? user.username : 'Unknown';
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
      case 'IN_PROGRESS': return 'In Progress';
      case 'COMPLETED': return 'Completed';
      case 'ON_HOLD': return 'On Hold';
      case 'NEW': return 'New';
      default: return {status};
    }
  };

  const getSortIcon = (field) => {
    if (sortConfig.field !== field) return '↕️';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  // ============== USE EFFECTS ==============
  useEffect(() => {
    const fetchNotifications = async () => {
      setNotificationsLoading(true);
      try {
        const response = await axios.get("/api/notifications");
        const notifications = Array.isArray(response.data) ? response.data : [];

        // ✅ Filter admin notifications correctly
        const adminNotifications = response.data.filter(
          n => n.user?.id === adminUserId
        );

        setNotifications(notifications);

        // ✅ Correct unread count
        const unread = adminNotifications.filter(
          n => n.status === "UNREAD"
        ).length;

        setUnreadCount(unread);

      } catch (error) {
        console.error("Error fetching notifications:", error);
      } finally {
        setNotificationsLoading(false);
      }
    };

    //fetchNotifications();
}, []);
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

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    if (role !== "ADMIN") {
      navigate("/dashboard", { replace: true });
      return;
    }

    checkBackendStatus();

    const notificationInterval = setInterval(() => {
      if (!showNotifications) {
        fetchUnreadCount();
      }
    }, 30000);

    return () => clearInterval(notificationInterval);
  }, [navigate, showNotifications]);

  useEffect(() => {
    fetchAllUserStatuses();
    const statusInterval = setInterval(fetchAllUserStatuses, 2000);
    return () => clearInterval(statusInterval);
  }, []);

  useEffect(() => {
    if (assignedTasks.length > 0) fetchAllUserStatuses();
  }, [assignedTasks]);

  useEffect(() => {
    applyFiltersAndSorting();
  }, [unassignedTasks, assignedTasks, filters, sortConfig]);

  useEffect(() => {
    calculateStatistics();
  }, [unassignedTasks, assignedTasks, users, userStatuses]);

  useEffect(() => {
    const handleClickOutside = () => closeContextMenu();
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!adminUserId) return;
    console.log(`🟢 Starting heartbeat for admin user ${adminUserId}`);
    sendAdminHeartbeat();
    const heartbeatInterval = setInterval(sendAdminHeartbeat, 2000);
    return () => {
      clearInterval(heartbeatInterval);
      if (adminUserId) {
        navigator.sendBeacon(`/api/activity/logout?userId=${adminUserId}`);
      }
    };
  }, [adminUserId]);

  useEffect(() => {
    const refreshData = async () => {
      console.log("🔄 Admin Dashboard mounted - refreshing all data");
      await fetchAllUserStatuses();
      await fetchAllData();
    };
    refreshData();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log("📱 Page became visible - refreshing data");
        fetchAllUserStatuses();
        fetchAllData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // ============== RENDER ==============
  if (loading && backendStatus === "checking") {
    return (
      <div className="admin-dashboard">
        <canvas ref={canvasRef} className="particles-bg"></canvas>
        <header className="dashboard-header">
  <h1>Admin Dashboard</h1>
  <div className="header-controls">
    <div className="notification-container">
      <button
        className={`notification-bell ${unreadCount > 0 ? 'has-unread' : ''}`}
        onClick={toggleNotifications}
      >
        🔔
        {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
      </button>

      {showNotifications && (
  <div className="notification-panel">
    <div className="notification-header">
      <h3>Notifications</h3>
      <div className="notification-actions">
        {notifications
          .filter(n => n.user?.id === adminUserId && n.status === 'UNREAD')
          .length > 0 && (
          <button onClick={markAllAsRead} className="mark-read-btn">
            Mark all as read
          </button>
        )}
        <button onClick={() => setShowNotifications(false)} className="close-btn">X</button>
      </div>
    </div>

    <div className="notification-list">
      {notificationsLoading ? (
        <div className="notification-loading">Loading...</div>
      ) : notifications.filter(n => n.user?.id === adminUserId).length === 0 ? (
        <div className="no-notifications">No notifications yet</div>
      ) : (
        notifications
          .filter(notification => notification.user?.id === adminUserId) // ✅ FIX HERE
          .map(notification => (
            <div
              key={notification.id}
              className={`notification-item ${notification.status === 'UNREAD' ? 'unread' : ''}`}
              onClick={() => markAsRead(notification.id)}
            >
              <div className="notification-content">
                <p className="notification-message">{notification.message}</p>
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

    {/* User Avatar Dropdown - ADD THIS */}
    <div className="user-avatar-wrapper" ref={menuRef}>
      <div className="user-avatar" onClick={toggleUserMenu}>
        <div className="avatar-initials">
          {adminUsername ? adminUsername.charAt(0).toUpperCase() : 'A'}
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
          <div className="spinner"></div>
          <p>Connecting to backend server...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <canvas ref={canvasRef} className="particles-bg"></canvas>

      <header className="dashboard-header">
  <h1>Admin Dashboard</h1>
  <div className="header-controls">
  <div className="notification-container">
      <button
        className={`notification-bell ${unreadCount > 0 ? 'has-unread' : ''}`}
        onClick={toggleNotifications}
      >
        🔔
        {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
      </button>
      {showNotifications && (
  <div className="notification-panel">
    <div className="notification-header">
      <h3>Notifications</h3>
      <div className="notification-actions">
        {notifications
          .filter(n => n.user?.id === adminUserId && n.status === 'UNREAD')
          .length > 0 && (
          <button onClick={markAllAsRead} className="mark-read-btn">
            Mark all as read
          </button>
        )}
        <button onClick={() => setShowNotifications(false)} className="close-btn">X</button>
      </div>
    </div>

    <div className="notification-list">
      {notificationsLoading ? (
        <div className="notification-loading">Loading...</div>
      ) : notifications.filter(n => n.user?.id === adminUserId).length === 0 ? (
        <div className="no-notifications">No notifications yet</div>
      ) : (
        notifications
          .filter(notification => notification.user?.id === adminUserId) // ✅ FIX HERE
          .map(notification => (
            <div
              key={notification.id}
              className={`notification-item ${notification.status === 'UNREAD' ? 'unread' : ''}`}
              onClick={() => markAsRead(notification.id)}
            >
              <div className="notification-content">
                <p className="notification-message">{notification.message}</p>
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
    {/* User Avatar Dropdown - ADD THIS */}
    <div className="user-avatar-wrapper" ref={menuRef}>
      <div className="user-avatar" onClick={toggleUserMenu}>
        <div className="avatar-initials">
          {adminUsername ? adminUsername.charAt(0).toUpperCase() : 'A'}
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
      {backendStatus === "offline" && (
        <div className="error-banner">
          <strong>⚠️ Backend Server Offline</strong>
          <p>Please start the backend server</p>
          <button onClick={checkBackendStatus} className="retry-btn">Retry Connection</button>
        </div>
      )}

      {error && (
        <div className="error-container">
          <div className="error-message">
            <strong>❌ {error}</strong>
            {errorDetails && <p className="error-details">{errorDetails}</p>}
          </div>
          <button onClick={fetchAllData} className="retry-btn">Retry</button>
        </div>
      )}

      {successMessage && <div className="success-message">✅ {successMessage}</div>}
      <div className="create-task-toggle">
  <button onClick={() => setShowCreateTask(true)} className="open-task-btn">
    ➕ Create Task
  </button>
</div>
      {showStatistics && (
        <div className="statistics-dashboard">
          <h2>Dashboard Overview</h2>

          <div className="stats-grid">
            <div className="stat-card total">
              <div className="stat-icon">📊</div>
              <div className="stat-content">
                <span className="stat-label">Total Tasks</span>
                <span className="stat-value">{statistics.totalTasks}</span>
              </div>
            </div>
            <div className="stat-card completed">
              <div className="stat-icon">✅</div>
              <div className="stat-content">
                <span className="stat-label">Completed</span>
                <span className="stat-value">{statistics.completedTasks}</span>
              </div>
            </div>
            <div className="stat-card pending">
              <div className="stat-icon">⏳</div>
              <div className="stat-content">
                <span className="stat-label">Pending</span>
                <span className="stat-value">{statistics.pendingTasks}</span>
              </div>
            </div>
            <div className="stat-card overdue">
              <div className="stat-icon">⚠️</div>
              <div className="stat-content">
                <span className="stat-label">Overdue</span>
                <span className="stat-value">{statistics.overdueTasks}</span>
              </div>
            </div>
          </div>

          <div className="stats-charts-row">
            <div className="chart-card">
              <h3>Tasks by Priority</h3>
              <div className="priority-bars">
                {Object.entries(statistics.tasksByPriority).map(([priority, count]) => (
                  <div key={priority} className="priority-bar-item">
                    <span className="priority-label">{priority}</span>
                    <div className="bar-container">
                      <div className={`bar ${priority.toLowerCase()}-bar`} style={{ width: `${(count / (statistics.totalTasks || 1)) * 100}%` }}>
                        {count}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="chart-card">
              <h3>Tasks by Status</h3>
              <div className="status-chart">
                {Object.entries(statistics.tasksByStatus).map(([status, count]) => (
                  <div key={status} className="status-item">
                    <span className={`status-dot ${status.toLowerCase().replace('_', '-')}`}></span>
                    <span className="status-label">{status.replace('_', ' ')}</span>
                    <span className="status-count">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="status-update-indicator">
            <span className={`update-dot ${Object.values(userStatuses).some(s => s.isOnline) ? 'has-online' : ''}`}></span>
            <span>Last updated: {new Date(lastUpdate).toLocaleTimeString()}</span>
            <button class="sort-btn ">⏱️ 2s polling</button>
            <button onClick={fetchAllUserStatuses} className="refresh-status-btn">🔄 REFRESH</button>
          </div>

          <div className="user-tasks-table">
            <h3>Tasks Per User</h3>
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>User</th>
                  <th>Email</th>
                  <th>Last Activity</th>
                  <th>Total Tasks</th>
                  <th>In Progress</th>
                  <th>On Hold</th>
                  <th>Completed</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {statistics.tasksPerUser.map(user => (
                  <tr key={user.userId}>
                    <td className="status-cell">
                      <span className={`online-indicator ${user.isOnline ? 'online' : 'offline'}`} title={user.isOnline ? 'Online' : 'Offline'}></span>
                    </td>
                    <td
  className="username-cell"
  onMouseEnter={(e) => handleUserHover(e, user)}
  onMouseLeave={handleUserLeave}
>
  <div className="user-info">
  <img
  src={getProfileImage(user.profilePicture)}
  alt="User"
/>
    <span>{user.username}</span>
  </div>
</td>
                    <td>{user.email}</td>
                    <td className="text-center">
  {user.lastActivity ? (
    <span
      className={user.isOnline ? 'text-success' : 'text-muted'}
    >
      <span
        className="cursor-help"
        title={user.isOnline ? 'Active now' : `Last active: ${getTimeAgo(user.lastActivity)}`}
      >
        {user.isOnline ? <div className="text-success">ONLINE</div> : getTimeAgo(user.lastActivity)}
      </span>
    </span>
  ) : (
    <span className="text-muted">Never</span>
  )}
</td>
                    <td className="text-center">{user.totalTasks}</td>
                    <td className="text-center">{user.inProgress}</td>
                    <td className="text-center">{user.onHold}</td>
                    <td className="text-center">{user.completed}</td>
                    <td className="text-center">
                      <button className="view-tasks-btn" onClick={() => viewUserTasks(user)} disabled={user.totalTasks === 0}>
                        View Tasks
                      </button>
                    </td>
                  </tr>
                ))}
                {statistics.tasksPerUser.length === 0 && (
                  <tr><td colSpan="9" className="text-center">No users found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showUserPopup && hoveredUser && (
        <div className="user-status-popup" style={{ position: 'fixed', top: popupPosition.y, left: popupPosition.x, transform: 'translateY(-100%)' }} onMouseEnter={handlePopupMouseEnter} onMouseLeave={handlePopupMouseLeave}>
          <div className="popup-header">
            <span className={`status-dot ${hoveredUser.isOnline ? 'online' : 'offline'}`}></span>
            <h4>{hoveredUser.username}</h4>
          </div>
          <div className="popup-content">
            <p><strong>Email:</strong> {hoveredUser.email}</p>
            <p><strong>Last Login:</strong> {hoveredUser.lastLogin ? getTimeAgo(hoveredUser.lastLogin) : 'Never'}</p>
            <p><strong>Last Activity:</strong> {hoveredUser.formattedLastActivity || 'No activity'}</p>
            <p><strong>Status:</strong> {hoveredUser.isOnline ? '🟢 Online' : '⚫ Offline'}</p>
          </div>
          <div className="popup-arrow"></div>
        </div>
      )}

      <div className="dashboard-content">
      <div className="tasks-view-wrapper">
  <div className="tasks-view-panel">
    {
		<div className="tasks-view-panel">
          <div className="filters-section">
            <h3>Filters & Sorting</h3>
            <div className="filters-grid">
              <div className="filter-group">
                <label>Search:</label>
                <input type="text" name="search" value={filters.search} onChange={handleFilterChange} placeholder="Search by title or description" className="search-input" />
              </div>
              <div className="filter-group">
                <label>Status:</label>
                <select name="status" value={filters.status} onChange={handleFilterChange}>
                  <option value="">All Status</option>
                  <option value="NEW">New</option>
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
                <input type="date" name="deadline" value={filters.deadline} onChange={handleFilterChange} />
              </div>
              <div className="filter-actions">
                <button onClick={clearFilters} className="clear-filters-btn">Clear Filters</button>
              </div>
            </div>
            <div className="sorting-controls">
              <span className="sort-label">Sort by:</span>
              <button className={`sort-btn ${sortConfig.field === 'title' ? 'active' : ''}`} onClick={() => handleSort('title')}>Title {getSortIcon('title')}</button>
              <button className={`sort-btn ${sortConfig.field === 'status' ? 'active' : ''}`} onClick={() => handleSort('status')}>Status {getSortIcon('status')}</button>
              <button className={`sort-btn ${sortConfig.field === 'priority' ? 'active' : ''}`} onClick={() => handleSort('priority')}>Priority {getSortIcon('priority')}</button>
              <button className={`sort-btn ${sortConfig.field === 'deadline' ? 'active' : ''}`} onClick={() => handleSort('deadline')}>Deadline {getSortIcon('deadline')}</button>
            </div>
          </div>

          <div className="tabs">
            <button className={`tab ${activeTab === 'unassigned' ? 'active' : ''}`} onClick={() => setActiveTab('unassigned')}>Unassigned Tasks ({filteredUnassignedTasks.length})</button>
            <button className={`tab ${activeTab === 'assigned' ? 'active' : ''}`} onClick={() => setActiveTab('assigned')}>Assigned Tasks ({filteredAssignedTasks.length})</button>
          </div>

          {activeTab === 'unassigned' && (
            <div className="tasks-grid-container">
              {filteredUnassignedTasks.length === 0 ? (
                <div className="empty-state">
                  <p>No unassigned tasks match your filters</p>
                  {(filters.search || filters.status || filters.priority || filters.deadline) && (
                    <button onClick={clearFilters} className="clear-filters-link">Clear filters</button>
                  )}
                </div>
              ) : (
                <div className="tasks-grid">
                  {filteredUnassignedTasks.map(task => (
                    <div key={task.id} className={`task-card ${getPriorityClass(task.priority)}`} onContextMenu={(e) => handleContextMenu(e, task)} onClick={() => handleTaskClick(task)}>
                      <div className="task-header">
                        <h3 title={task.title}>{task.title}</h3>
                        <h4>{getStatusBadge(task.status)}</h4>
                      </div>
                      <p className="task-description" title={task.description}>{task.description}</p>
                      <div className="task-footer">
                        <span className="task-priority">Priority: <span class="priority-badge critical">{task.priority}</span></span>
                        <span className="task-deadline">  Due: <button class="view-tasks-btn">{task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No deadline'}</button></span>
                      </div>
                      <div className="task-hint">Right-click for options</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'assigned' && (
            <div className="tasks-grid-container">
              {filteredAssignedTasks.length === 0 ? (
                <div className="empty-state">
                  <p>No assigned tasks match your filters</p>
                  {(filters.search || filters.status || filters.priority || filters.deadline) && (
                    <button onClick={clearFilters} className="clear-filters-link">Clear filters</button>
                  )}
                </div>
              ) : (
                <div className="tasks-grid">
                  {filteredAssignedTasks.map(task => (
                    <div key={task.id} className={`task-card ${getPriorityClass(task.priority)}`} onContextMenu={(e) => handleContextMenu(e, task)} onClick={() => handleTaskClick(task)}>
                      <div className="task-header">
                        <h3 title={task.title}>{task.title}</h3>
                        <h4>{getStatusBadge(task.status)}</h4>
                      </div>
                      <p className="task-description" title={task.description}>{task.description}</p>
                      <div className="task-assignee">Assigned to: <button class="view-tasks-btn">{task.assignedUser?.username || 'Unknown'}</button></div>
                      <div className="task-footer">
                        <span className="task-priority">Priority: <span class="priority-badge critical">{task.priority}</span></span>
                        <span className="task-deadline">  Due: <button class="view-tasks-btn">{task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No deadline'}</button></span>
                      </div>
                      <div className="task-hint">Right-click for options</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
	}
  </div>
</div>
      </div>
      {showCreateTask && (
  <div
    onClick={() => setShowCreateTask(false)}
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      zIndex: 9999
    }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)"
      }}
    >
      <div className="create-task-panel">
        {
			<div className="create-task-panel">
          <h2>Create New Task</h2>
          <form onSubmit={handleCreateTask} className="task-form">
            <div className="form-group">
              <label>Title:</label>
              <input type="text" value={newTask.title} onChange={(e) => setNewTask({...newTask, title: e.target.value})} required placeholder="Enter task title" />
            </div>
            <div className="form-group">
              <label>Description:</label>
              <textarea value={newTask.description} onChange={(e) => setNewTask({...newTask, description: e.target.value})} required rows="4" placeholder="Enter task description" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Priority:</label>
                <select value={newTask.priority} onChange={(e) => setNewTask({...newTask, priority: e.target.value})}>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
              <div className="form-group">
                <label>Deadline:</label>
                <input type="date" value={newTask.deadline} onChange={(e) => setNewTask({...newTask, deadline: e.target.value})} required />
              </div>
            </div>
            <button type="submit" className="create-btn" disabled={loading}>{loading ? "Creating..." : "Create Task"}</button>
          </form>
        </div>
		}
      </div>
    </div>
  </div>
)}
      {showUserTasksModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowUserTasksModal(false)}>
          <div className="modal user-tasks-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Tasks for <button class="view-tasks-btn">{selectedUser.username}</button></h3>
              <button onClick={() => setShowUserTasksModal(false)} className="close-btn">✕</button>
            </div>
            <div className="user-tasks-list">
              {userTasks.length === 0 ? <p className="no-tasks-message">No tasks assigned to this user</p> : userTasks.map(task => (
                <div key={task.id} className="user-task-item">
                  <div className="user-task-header">
                    <h4>{task.title}</h4>
                    <span className={`task-status-badge ${task.status.toLowerCase()}`}>{task.status}</span>
                  </div>
                  <p className="user-task-description">{task.description}</p>
                  <div className="user-task-footer">
                    <span className="task-priority">Priority: <span class="priority-badge critical">{task.priority}</span></span>
                    <span className="task-deadline">  Due: <button class="view-tasks-btn">{task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No deadline'}</button></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {contextMenu.visible && (
        <div className="context-menu" style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x, zIndex: 1000 }}>
          {contextMenu.task.status === 'NEW' ? (
            <>
              <div className="menu-item" onClick={() => handleAssignTask(contextMenu.task)}>Assign Task</div>
              <div className="menu-item" onClick={() => handleEditTask(contextMenu.task)}>Edit Task</div>
              <div className="menu-item delete" onClick={() => handleDeleteTask(contextMenu.task)}>Delete Task</div>
            </>
          ) : (
            <>
              <div className="menu-item" onClick={() => handleReassignTask(contextMenu.task)}>Reassign Task</div>
              <div className="menu-item" onClick={() => handleUnassignTask(contextMenu.task)}>Unassign Task</div>
              <div className="menu-item" onClick={() => handleEditTask(contextMenu.task)}>Edit Task</div>
              <div className="menu-item delete" onClick={() => handleDeleteTask(contextMenu.task)}>Delete Task</div>
            </>
          )}
        </div>
      )}

      {showAssignModal && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal assign-modal" onClick={e => e.stopPropagation()}>
            <h3>Assign Task: {selectedTaskForAssign?.title}</h3>
            <p>Select a user to assign this task:</p>
            {users.length === 0 ? (
              <div className="no-users-message"><p>No users available</p><button onClick={fetchAllData} className="retry-btn">Refresh</button></div>
            ) : (
              <div className="user-list">
                {users.map(user => {
                  const userStatus = userStatuses[user.id] || {};
                  return (
                    <div key={user.id} className="user-item" onClick={() => confirmAssignment(user.id)}>
                      <span className={`user-status-indicator ${userStatus.isOnline ? 'online' : 'offline'}`}></span>
                      <span className="user-name">{user.username}</span>
                      <span className="user-email">{user.email}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <button className="cancel-btn" onClick={() => setShowAssignModal(false)}>Cancel</button>
          </div>
        </div>
      )}

      {showReassignModal && (
        <div className="modal-overlay" onClick={() => setShowReassignModal(false)}>
          <div className="modal assign-modal" onClick={e => e.stopPropagation()}>
            <h3>Reassign Task: {selectedTaskForReassign?.title}</h3>
            <p>Current assignee: <strong>{selectedTaskForReassign?.assignedUser?.username}</strong></p>
            <p>Select a new user:</p>
            {users.length === 0 ? (
              <div className="no-users-message"><p>No users available</p><button onClick={fetchAllData} className="retry-btn">Refresh</button></div>
            ) : (
              <div className="user-list">
                {users.map(user => {
                  const userStatus = userStatuses[user.id] || {};
                  return (
                    <div key={user.id} className="user-item" onClick={() => confirmReassignment(user.id)}>
                      <span className={`user-status-indicator ${userStatus.isOnline ? 'online' : 'offline'}`}></span>
                      <span className="user-name">{user.username}</span>
                      <span className="user-email">{user.email}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <button className="cancel-btn" onClick={() => setShowReassignModal(false)}>Cancel</button>
          </div>
        </div>
      )}

      {showUnassignConfirm && (
        <div className="modal-overlay" onClick={() => setShowUnassignConfirm(false)}>
          <div className="modal confirm-modal" onClick={e => e.stopPropagation()}>
            <h3>Unassign Task</h3>
            <p>Are you sure you want to unassign "{taskToUnassign?.title}"?</p>
            <p>This task will be moved back to the unassigned queue.</p>
            <div className="modal-actions">
              <button onClick={confirmUnassign} className="unassign-btn">Yes, Unassign</button>
              <button onClick={() => setShowUnassignConfirm(false)} className="cancel-btn">No, Keep</button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && editingTask && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal edit-modal" onClick={e => e.stopPropagation()}>
            <h3>Edit Task</h3>
            <div className="form-group"><label>Title:</label><input type="text" value={editingTask.title} onChange={(e) => setEditingTask({...editingTask, title: e.target.value})} /></div>
            <div className="form-group"><label>Description:</label><textarea value={editingTask.description} onChange={(e) => setEditingTask({...editingTask, description: e.target.value})} rows="3" /></div>
            <div className="form-row">
              <div className="form-group"><label>Priority:</label><select value={editingTask.priority} onChange={(e) => setEditingTask({...editingTask, priority: e.target.value})}><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="CRITICAL">Critical</option></select></div>
              <div className="form-group"><label>Deadline:</label><input type="date" value={editingTask.deadline?.split('T')[0]} onChange={(e) => setEditingTask({...editingTask, deadline: e.target.value})} /></div>
            </div>
            <div className="form-group"><label>Status:</label><select value={editingTask.status} onChange={(e) => setEditingTask({...editingTask, status: e.target.value})}><option value="NEW">New</option><option value="IN_PROGRESS">In Progress</option><option value="ON_HOLD">On Hold</option><option value="COMPLETED">Completed</option></select></div>
            <div className="modal-actions"><button onClick={saveEditedTask} className="save-btn">Save Changes</button><button onClick={() => setShowEditModal(false)} className="cancel-btn">Cancel</button></div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal confirm-modal" onClick={e => e.stopPropagation()}>
            <h3>Delete Task</h3>
            <p>Are you sure you want to delete "{taskToDelete?.title}"?</p>
            <p className="warning">This action cannot be undone!</p>
            <div className="modal-actions"><button onClick={confirmDelete} className="delete-btn">Yes, Delete</button><button onClick={() => setShowDeleteConfirm(false)} className="cancel-btn">No, Cancel</button></div>
          </div>
        </div>
      )}

      {showTaskDetails && selectedTaskDetails && (
        <div className="modal-overlay" onClick={() => setShowTaskDetails(false)}>
          <div className="modal task-details-modal" onClick={e => e.stopPropagation()}>
            <h2>{selectedTaskDetails.title}</h2>
            <div className="detail-row"><label>Description:</label><h4>{selectedTaskDetails.description || 'No description'}</h4></div>
            <div className="detail-row"><label>Priority:</label><span className={`priority-badge ${selectedTaskDetails.priority?.toLowerCase()}`}>{selectedTaskDetails.priority}</span></div>
            <div className="detail-row"><label>Deadline:</label><span><button class="view-tasks-btn">{selectedTaskDetails.deadline ? new Date(selectedTaskDetails.deadline).toLocaleDateString() : 'No deadline'}</button></span></div>
            <div className="detail-row"><label>Status:</label><button class="view-tasks-btn">{getStatusBadge(selectedTaskDetails.status)}</button></div>
            {selectedTaskDetails.status !== 'NEW' && <div className="detail-row"><label>Assigned to:</label><button class="view-tasks-btn">{selectedTaskDetails.assignedUser?.username || 'Unknown'}</button></div>}
            <button className="close-btn" onClick={() => setShowTaskDetails(false)}>x</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;