import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios, { API_URL } from './axiosConfig.js';
import "./AdminDashboard.css";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// Configure axios defaults
axios.defaults.headers.common['Content-Type'] = 'application/json';
axios.defaults.withCredentials = true;

function AdminDashboard() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);

  // ============== CHART REFS ==============
  const donutCanvasRef = useRef(null);
  const priorityCanvasRef = useRef(null);
  const workloadCanvasRef = useRef(null);
  const gaugeCanvasRef = useRef(null);

  // ============== STATE DECLARATIONS ==============
  const [unassignedTasks, setUnassignedTasks] = useState([]);
  const [assignedTasks, setAssignedTasks] = useState([]);
  const [filteredUnassignedTasks, setFilteredUnassignedTasks] = useState([]);
  const [filteredAssignedTasks, setFilteredAssignedTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [UsersRole, setUsersRole] = useState([]);  // Store users with roles
  const [pdfMessages, setPdfMessages] = useState([]);

  const [showCreateTask, setShowCreateTask] = useState(false);
  const [userStatuses, setUserStatuses] = useState({});
  const taskDetailsRef = useRef();

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
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [activeTab, setActiveTab] = useState("unassigned");
  const [backendStatus, setBackendStatus] = useState("checking");
  const [wakeupStatus, setWakeupStatus] = useState("idle"); // idle | waking | online | failed
  const [wakeupCountdown, setWakeupCountdown] = useState(0);
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

  const [showMessageHistory, setShowMessageHistory] = useState(false);
  const [messages, setMessages] = useState([]);

  const [showUnassignConfirm, setShowUnassignConfirm] = useState(false);
  const [taskToUnassign, setTaskToUnassign] = useState(null);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  const [showUserTasksModal, setShowUserTasksModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userTasks, setUserTasks] = useState([]);

  const [adminProfilePicture, setAdminProfilePicture] = useState("");
  const [AdminUsername, setAdminUsername] = useState("");
  const [userPictures, setUserPictures] = useState({});

  const adminUserId = localStorage.getItem("userId");
  const adminUsername = localStorage.getItem("username");

  // ============== TIME FORMATTING FUNCTIONS ==============
  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    date.setHours(date.getHours() + 5);
    date.setMinutes(date.getMinutes() + 30);
    let formatted = date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
    formatted = formatted.replace("am", "AM").replace("pm", "PM");
    return formatted;
  };
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

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return 'Never';

    // Convert MySQL timestamp format → ISO format
    const isoTimestamp = timestamp.replace(' ', 'T');

    // Treat as UTC
    const date = new Date(isoTimestamp + 'Z');

    const now = new Date();
    const diffMs = now - date;

    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleString('en-IN'); // 🇮🇳 IST format
  };
  const getTimeAgoIST = (timestamp) => {
    if (!timestamp) return 'Never';

    const date = new Date(timestamp);

    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return formatLocalTime(date);
  };
  const formatLastActivity = (isoString) => {
    if (!isoString) return "N/A";

    const date = new Date(isoString);

    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    });
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
    const MAX_WAIT_MS = 60000;   // 60s total — Railway cold start can take ~60 s
    const POLL_INTERVAL = 5000;  // probe every 5 s
    const TIMEOUT_PER_REQ = 9000;

    setWakeupStatus("waking");
    setBackendStatus("checking");
    setError("");

    const started = Date.now();

    // Countdown ticker — updates every second so the user sees it decrement
    const tickInterval = setInterval(() => {
      const elapsed = Date.now() - started;
      const remaining = Math.max(0, Math.ceil((MAX_WAIT_MS - elapsed) / 1000));
      setWakeupCountdown(remaining);
    }, 1000);

    const cleanup = () => clearInterval(tickInterval);

    while (Date.now() - started < MAX_WAIT_MS) {
      try {
        // Use /health (returns JSON {status:"UP"}) with NO credentials so CORS
        // preflight never blocks the cold-start ping. Absolute URL bypasses
        // axios baseURL so even a mis-configured instance works.
        await axios.get(`${API_URL}/health`, {
          timeout: TIMEOUT_PER_REQ,
          withCredentials: false,   // no preflight credential dance
          headers: {},              // no custom headers → no preflight at all
        });
        // ✅ Server is awake
        cleanup();
        setWakeupStatus("online");
        setBackendStatus("online");
        setWakeupCountdown(0);
        fetchAllData();
        fetchUnreadCount();
        fetchAllUserStatuses();
        return;
      } catch (err) {
        // Still waking — wait then retry
        await new Promise(res => setTimeout(res, POLL_INTERVAL));
      }
    }

    // ❌ Gave up after MAX_WAIT_MS
    cleanup();
    setWakeupStatus("failed");
    setBackendStatus("offline");
    setWakeupCountdown(0);
    setError("Backend did not respond after 90 seconds");
    setErrorDetails("Railway may be deploying. Wait a minute then press Retry.");
    setLoading(false);
  };
  const fetchAllData = async () => {
    setLoading(true);
    setError("");

    try {
      const unassignedRes = await axios.get("/api/tasks/unassigned");
      const unassigned = Array.isArray(unassignedRes.data) ? unassignedRes.data : [];
      setUnassignedTasks(unassigned);
      const allTasksRes = await axios.get("/api/tasks");
      const allTasks = Array.isArray(allTasksRes.data) ? allTasksRes.data : [];

      const assignedRes = await axios.get("/api/tasks/assigned");
      setAssignedTasks(assignedRes.data);

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

  const fetchMessages = async (taskId) => {
    try {
      const response = await axios.get(`/api/tasks/${taskId}/messages`);
      setMessages(response.data);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };
  const fetchUserRole = async (userId) => {
    try {
        const response = await axios.get(`/api/users/role/${userId}`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching role for user ${userId}:`, error);
        return "";
    }
  };
  const updateUsersWithRoles = async () => {
    setLoading(true);
    const usersWithRoles = await Promise.all(
        users.map(async (user) => {
            const role = await fetchUserRole(user.id);
            return { ...user, role };
        })
    );
    setUsersRole(usersWithRoles);
    setLoading(false);
  };

  const generateReport = async () => {
    try {
      const response = await axios.get(`/api/tasks/${selectedTaskDetails.id}/messages`);
      setPdfMessages(response.data || []);

      setTimeout(async () => {
        const element = document.getElementById("pdf-content");
        const canvas = await html2canvas(element, {
          scale: 2,
          backgroundColor: "#0f0c29"
        });

        const imgData = canvas.toDataURL("image/png");

        const pdf = new jsPDF("p", "mm", "a4");

        const pageWidth = 210;
        const pageHeight = 297;

        const margin = 10;
        const usableWidth = pageWidth - margin * 2;

        const imgHeight = (canvas.height * usableWidth) / canvas.width;

        let heightLeft = imgHeight;
        let position = 0;

        // First page
        pdf.addImage(imgData, "PNG", margin, position + 10, usableWidth, imgHeight);
        heightLeft -= pageHeight;

        //pages
        while (heightLeft > 0) {
          position = heightLeft - imgHeight;

          pdf.addPage();
          pdf.addImage(imgData, "PNG", margin, position + 10, usableWidth, imgHeight);

          heightLeft -= pageHeight;
        }

        pdf.save(`Task_Report_${selectedTaskDetails.id}.pdf`);

      }, 300); // wait for render

    } catch (error) {
      console.error(error);
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
    //console.log(`set-filteredUnAssigned(): `,filteredUnassigned);
    setFilteredAssignedTasks(sortTasks(filteredAssigned));
    //console.log(`set-filteredAssigned(): `,filteredAssigned);
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
      const response = await axios.get(`/api/notifications/user/${adminUserId}`);

      console.log("API RESPONSE:", response.data);

      // ✅ Handle all possible formats safely
      const data = response.data;

      let notifications = [];

      if (Array.isArray(data)) {
        notifications = data;
      } else if (Array.isArray(data?.data)) {
        notifications = data.data;
      } else {
        console.warn("Unexpected API format:", data);
      }

      setNotifications(notifications);

      const unread = notifications.filter(n => n.status === "UNREAD").length;
      setUnreadCount(unread);

    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await axios.get(`/api/notifications/unread/count/${adminUserId}`);
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

    let x = e.clientX;
    let y = e.clientY;

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
      case 'IN_PROGRESS': return 'IN PROGRESS';
      case 'COMPLETED': return 'COMPLETED';
      case 'ON_HOLD': return 'ON HOLD';
      case 'NEW': return 'NEW';
      default: return status;
    }
  };

  const getSortIcon = (field) => {
    if (sortConfig.field !== field) return '↕️';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  // ============== USE EFFECTS ==============
  useEffect(() => {
    axios.get(`/api/users/${adminUserId}`)
      .then(res => {
        setAdminUsername(res.data.username);
        setAdminProfilePicture(res.data.profilePicture);
      });
  }, []);
  useEffect(() => {
    statistics.tasksPerUser.forEach(user => {
      axios.get(`/api/users/${user.userId}`)
        .then(res => {
          setUserPictures(prev => ({
            ...prev,
            [user.userId]: res.data.profilePicture
          }));
        });
    });
  }, [statistics.tasksPerUser]);
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
  useEffect(() => {
    const client = new Client({
      webSocketFactory: () =>
        new SockJS("https://smart-task-system-production-8b1e.up.railway.app/ws"),

      reconnectDelay: 5000,

      onConnect: () => {
        console.log("✅ Connected to WebSocket");

        client.subscribe("/topic/tasks", (message) => {
          const updatedTask = JSON.parse(message.body); // ✅ FIX

          // ✅ Update modal in realtime
          setSelectedTaskDetails((prev) => {
            if (!prev) return prev;

            if (prev.id === updatedTask.id) {
              return updatedTask;
            }

            return prev;
          });

          // ✅ Unassigned
          setUnassignedTasks((prev) => {
            let updated = prev.filter(t => t.id !== updatedTask.id);

            if (updatedTask.status === "NEW") {
              updated.unshift(updatedTask);
            }

            return updated;
          });

          // ✅ Assigned
          setAssignedTasks((prev) => {
            let updated = prev.filter(t => t.id !== updatedTask.id);

            if (updatedTask.status !== "NEW") {
              updated.unshift(updatedTask);
            }

            return updated;
          });
        });
      },

      onStompError: (frame) => {
        console.error("❌ Broker error:", frame);
      },

      onWebSocketError: (error) => {
        console.error("❌ WebSocket error:", error);
      }
    });

    client.activate();

    return () => client.deactivate();
  }, []);
  useEffect(() => {
    if (isInitialLoad && filteredUnassignedTasks.length >= 0) {
      if (filteredUnassignedTasks.length > 0) {
        setActiveTab("unassigned");
      } else {
        setActiveTab("assigned");
      }
      setIsInitialLoad(false); // ✅ stop future runs
    }
  }, [filteredUnassignedTasks, isInitialLoad]);

  useEffect(() => {
    if (!adminUserId) return;

    fetchNotifications();
  }, [adminUserId]);
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
    //const role = localStorage.getItem("role");

    if (!token) {
      navigate("/login", { replace: true });
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

  // ============== CHART: STATUS DONUT ==============
  useEffect(() => {
    const canvas = donutCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const size = 220;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);

    const cx = size / 2, cy = size / 2, outerR = 88, innerR = 52;
    const statusColors = { NEW: '#6366f1', IN_PROGRESS: '#f59e0b', ON_HOLD: '#64748b', COMPLETED: '#10b981' };
    const data = statistics.tasksByStatus;
    const total = Object.values(data).reduce((a, b) => a + b, 0);

    if (total === 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(148,163,184,0.2)';
      ctx.lineWidth = outerR - innerR;
      ctx.stroke();
      ctx.fillStyle = 'rgba(148,163,184,0.5)';
      ctx.font = '13px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('No data', cx, cy + 5);
      return;
    }

    let startAngle = -Math.PI / 2;
    const slices = Object.entries(data);
    slices.forEach(([key, val]) => {
      if (val === 0) return;
      const slice = (val / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, outerR, startAngle, startAngle + slice);
      ctx.closePath();
      ctx.fillStyle = statusColors[key] || '#94a3b8';
      ctx.fill();
      startAngle += slice;
    });

    // Donut hole
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--chart-bg') || '#1e293b';
    ctx.fill();

    // Center label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(total, cx, cy - 8);
    ctx.font = '24px Arial';
    ctx.fillText('tasks', cx, cy + 10);

    // Gap lines between slices
    startAngle = -Math.PI / 2;
    slices.forEach(([key, val]) => {
      if (val === 0) return;
      const slice = (val / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx + innerR * Math.cos(startAngle), cy + innerR * Math.sin(startAngle));
      ctx.lineTo(cx + outerR * Math.cos(startAngle), cy + outerR * Math.sin(startAngle));
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 2;
      ctx.stroke();
      startAngle += slice;
    });
  }, [statistics.tasksByStatus]);

  // ============== CHART: PRIORITY HORIZONTAL BAR ==============
  useEffect(() => {
    const canvas = priorityCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const W = 360, H = 180;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const priorities = ['LOW','MEDIUM','HIGH','CRITICAL'];
    const colors = { LOW: '#22c55e',MEDIUM: '#f59e0b',HIGH: '#f97316',CRITICAL: '#ef4444' };
    const data = statistics.tasksByPriority;
    const maxVal = Math.max(...priorities.map(p => data[p] || 0), 1);
    const barH = 28, gap = 14, leftPad = 74, rightPad = 44, topPad = 14;

    priorities.forEach((priority, i) => {
      const val = data[priority] || 0;
      const barW = ((W - leftPad - rightPad) * val) / maxVal;
      const y = topPad + i * (barH + gap);

      // Label
      ctx.fillStyle = '#ffffff';
      ctx.font = '19px Arial';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(priority.charAt(0) + priority.slice(1).toLowerCase(), leftPad - 8, y + barH / 2);

      // Track
      ctx.fillStyle = 'rgba(148,163,184,0.12)';
      ctx.beginPath();
      ctx.roundRect(leftPad, y, W - leftPad - rightPad, barH, 6);
      ctx.fill();

      // Bar
      if (val > 0) {
        ctx.fillStyle = colors[priority];
        ctx.beginPath();
        ctx.roundRect(leftPad, y, barW, barH, 6);
        ctx.fill();
      }

      // Value
      ctx.fillStyle = '#f1f5f9';
      ctx.font = 'bold 22px Arial';
      ctx.textBaseline = 'middle';
      const textX = val > 0 ? leftPad + barW + 6  : W - rightPad + 6;
      ctx.textAlign = 'left';
      ctx.fillText(val, textX, y + barH / 2);
    });
  }, [statistics.tasksByPriority]);

  // ============== CHART: WORKLOAD BAR (per user) ==============
  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const width = ctx.measureText(testLine).width;

      if (width > maxWidth && n > 0) {
        ctx.fillText(line, x, y);
        line = words[n] + ' ';
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, y);
  }
  useEffect(() => {
    const canvas = workloadCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    // console.log("users:", statistics.tasksPerUser);
    // console.log("adminUserId:", adminUserId, typeof adminUserId);
    const users = statistics.tasksPerUser.filter(u => String(u.userId) !== String(adminUserId)).slice(0, 6);
    const W = 420, H = 280;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    if (users.length === 0) {
      ctx.fillStyle = '#FF0000';
      ctx.font = '22px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('NO USER FOUND!', W / 2, H / 2);
      return;
    }

    const maxVal = Math.max(...users.map(u => u.totalTasks), 1);
    const bottomPad = 90, topPad = 14, leftPad = 14, rightPad = 54;
    const chartH = H - topPad - bottomPad;
    const barW = Math.floor((W - leftPad - rightPad) / users.length) - 8;
    const groupW = (W - leftPad - rightPad) / users.length;

    users.forEach((user, i) => {
      const x = leftPad + i * groupW + (groupW - barW) / 2;
      const segments = [
        { val: user.inProgress, color: '#f59e0b' },
        { val: user.onHold, color: '#64748b' },
        { val: user.completed, color: '#10b981' },
      ];

      let stackY = topPad + chartH;
      const totalUserTasks = user.totalTasks || 0;

      segments.forEach(seg => {
        if (seg.val <= 0) return;
        const segH = (seg.val / maxVal) * chartH;
        stackY -= segH;
        ctx.fillStyle = seg.color;
        ctx.beginPath();
        ctx.roundRect(x, stackY, barW, segH, stackY === topPad + chartH - segH ? [0, 0, 4, 4] : 0);
        ctx.fill();
      });

      // Username truncated
      ctx.fillStyle = '#CF9FFF';
      ctx.font = '22px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const name = user.username.length > 7 ? user.username.slice(0, 6) + '…' : user.username;
      // ctx.fillText(name, x + barW / 2, H - bottomPad + 6);
      ctx.fillText(name, x + barW / 2, H - bottomPad + 10);

      // Total count
      if (totalUserTasks > 0) {
        ctx.fillStyle = '#FF0000';
        ctx.font = 'bold 22px Arial';
        ctx.textBaseline = 'bottom';
        ctx.fillText(totalUserTasks, x + barW / 2, stackY - 2);
      }
    });

    // Legend
    const legend = [{ label: 'In Progress', color: '#f59e0b' }, { label: 'On Hold', color: '#FC0000' }, { label: 'Completed', color: '#10b981' }];
    const legendY = H - 30;
    let currentX = leftPad;
    ctx.font = '20px Arial';
    legend.forEach((item) => {
      const textWidth = ctx.measureText(item.label).width;

      // Box
      ctx.fillStyle = item.color;
      ctx.fillRect(currentX, legendY, 14, 14);

      // Text
      ctx.fillStyle = item.color;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      // ctx.fillText(item.label, currentX + 20, legendY + 7);
      wrapText(ctx, item.label, currentX + 20, legendY + 7, 80, 16);
      // Move X dynamically (box + gap + text + spacing)
      currentX += 20 + textWidth + 24;
    });
  }, [statistics.tasksPerUser]);

  // ============== CHART: COMPLETION GAUGE ==============
  useEffect(() => {
    const canvas = gaugeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const W = 220, H = 140;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const total = statistics.totalTasks || 0;
    const completed = statistics.completedTasks || 0;
    const pct = total === 0 ? 0 : completed / total;

    const cx = W / 2, cy = 115, radius = 88;
    const startAngle = Math.PI, endAngle = Math.PI * 2;

    // Track arc
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.strokeStyle = 'rgba(148,163,184,0.15)';
    ctx.lineWidth = 18;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Value arc
    if (pct > 0) {
      const valueEnd = startAngle + pct * Math.PI;
      const gradient = ctx.createLinearGradient(cx - radius, cy, cx + radius, cy);
      gradient.addColorStop(0, '#6366f1');
      gradient.addColorStop(1, '#10b981');
      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, valueEnd);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 18;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    // Percentage text
    ctx.fillStyle = '#00ff00';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(Math.round(pct * 100) + '%', cx, cy - 16);
    ctx.fillStyle = '#00ff00';
    ctx.font = '22px Arial';
    ctx.fillText('completion rate', cx, cy + 8);

    // // Min/Max labels
    // ctx.fillStyle = '#64748b';
    // ctx.font = '22px Arial';
    // ctx.textAlign = 'left';
    // ctx.fillText('0%', cx - radius - 4, cy + 20);
    // ctx.textAlign = 'right';
    // ctx.fillText('100%', cx + radius + 4, cy + 20);

    // Sub label
    // ctx.fillStyle = '#64748b';
    // ctx.font = '22px Arial';
    // ctx.textAlign = 'center';
    // ctx.fillText(completed + ' of ' + total + ' tasks done', cx, cy + 26);
  }, [statistics.totalTasks, statistics.completedTasks]);

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
    if (users.length > 0) {
        updateUsersWithRoles();
    }
  }, [users]);
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
              {notifications.filter(n => n.status === 'UNREAD')
                .length > 0 && (
                <button onClick={markAllAsRead} className="mark-read-btn">
                  Mark all as read
                </button>
              )}
              <button onClick={() => setShowNotifications(false)} className="close-btn">x</button>
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
    {/* User Avatar Dropdown */}
    <div className="user-avatar-wrapper" ref={menuRef}>
      <div className="user-avatar" onClick={toggleUserMenu}>
      <img
        src={adminProfilePicture || "/default-avatar.png"}
        alt="Profile"
        className="avatar-image"
      />
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
        <div className="wakeup-container">
          <div className="wakeup-icon">🚀</div>
          <h2 className="wakeup-title">Starting backend server…</h2>
          <p className="wakeup-subtitle">
            Railway free tier spins down after inactivity.<br />
            Waking it up — this takes up to 60 seconds.
          </p>
          <div className="wakeup-bar-track">
            <div
              className="wakeup-bar-fill"
              style={{ width: `${Math.max(4, 100 - (wakeupCountdown / 90) * 100)}%` }}
            ></div>
          </div>
          <p className="wakeup-timer">
            {wakeupCountdown > 0
              ? `Retrying automatically… ${wakeupCountdown}s`
              : "Connecting…"}
          </p>
          <div className="wakeup-dots">
            <span></span><span></span><span></span>
          </div>
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
          {notifications.filter(n => n.status === 'UNREAD')
            .length > 0 && (
              <button onClick={markAllAsRead} className="mark-read-btn">
                Mark all as read
              </button>
            )}
            <button onClick={() => setShowNotifications(false)} className="close-btn">x</button>
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
    {/* User Avatar Dropdown */}
    <div className="user-avatar-wrapper" ref={menuRef}>
      <div className="user-avatar" onClick={toggleUserMenu}>
        {adminProfilePicture ? (
                  <img
                    src={adminProfilePicture}
                    alt="Profile"
                    className="avatar-image"
                  />
                ) : (
                  <div className="avatar-fallback">
                    {adminUsername ? adminUsername.charAt(0).toUpperCase() : "A"}
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
</header>
      {backendStatus === "offline" && wakeupStatus === "failed" && (
        <div className="wakeup-banner wakeup-banner--failed">
          <div className="wakeup-banner-icon">⚠️</div>
          <div className="wakeup-banner-body">
            <strong>Backend did not respond</strong>
            <p>Railway may still be deploying. Wait 30 seconds then retry.</p>
          </div>
          <button onClick={checkBackendStatus} className="wakeup-retry-btn">
            🔄 Retry
          </button>
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
            <div className="stat-card completed">
              <div className="stat-icon-checkmark"></div>
              <div className="stat-content">
                <span className="stat-label">Completed</span>
                <span className="stat-value">{statistics.completedTasks}</span>
              </div>
            </div>
          </div>

          {/* ============ CHARTS ROW ============ */}
          <div className="stats-charts-row charts-grid-4">

            {/* 1. STATUS DONUT */}
            <div className="chart-card chart-card-donut">
              <h3 className="chart-title">Task Status</h3>
              <div className="chart-canvas-wrap">
                <canvas ref={donutCanvasRef}></canvas>
              </div>
              <div className="chart-legend">
                {[
                  { key: 'NEW', label: 'New', color: '#6366f1' },
                  { key: 'IN_PROGRESS', label: 'In Progress', color: '#f59e0b' },
                  { key: 'ON_HOLD', label: 'On Hold', color: '#fa0000' },
                  { key: 'COMPLETED', label: 'Completed', color: '#10b981' },
                ].map(item => {
                  const value = statistics.tasksByStatus[item.key] || 0;
                  return (
                    <div key={item.key} className="legend-item">
                      <span className="legend-dot" style={{ color: item.color }}></span>
                      <span className="legend-label" style={{ color: item.color }}>{item.label}</span>
                      <span className="legend-val" style={{ color: item.color }}>{value}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            {/* 2. PRIORITY HORIZONTAL BAR */}
            <div className="chart-card chart-card-priority">
              <h3 className="chart-title">Tasks by Priority</h3>
              <div className="chart-canvas-wrap">
                <canvas ref={priorityCanvasRef}></canvas>
              </div>
            </div>

            {/* 3. WORKLOAD STACKED BAR */}
            <div className="chart-card chart-card-workload">
              <h3 className="chart-title">User Workload</h3>
              <div className="chart-canvas-wrap">
                <canvas ref={workloadCanvasRef}></canvas>
              </div>
            </div>

            {/* 4. COMPLETION GAUGE */}
            <div className="chart-card chart-card-gauge">
              <h3 className="chart-title">Overall Progress</h3>
              <div className="chart-canvas-wrap">
                <canvas ref={gaugeCanvasRef}></canvas>
              </div>
              <div className="gauge-stats">
                <div className="gauge-stat">
                  <span className="gauge-stat-val" style={{ color: '#10b981' }}>{statistics.completedTasks}</span>
                  <span className="gauge-stat-label">Done</span>
                </div>
                <div className="gauge-stat">
                  <span className="gauge-stat-val" style={{ color: '#f59e0b' }}>{statistics.pendingTasks}</span>
                  <span className="gauge-stat-label">Pending</span>
                </div>
                <div className="gauge-stat">
                  <span className="gauge-stat-val" style={{ color: '#ef4444' }}>{statistics.overdueTasks}</span>
                  <span className="gauge-stat-label">Overdue</span>
                </div>
              </div>
            </div>

          </div>

          {/* REMOVED POLLING AS IT IS REPLACED BY WEBSOCKET REALTIME UPDATING
          <div className="status-update-indicator">
            <span className={`update-dot ${Object.values(userStatuses).some(s => s.isOnline) ? 'has-online' : ''}`}></span>
            <span>Last updated: {new Date(lastUpdate).toLocaleTimeString()}</span>
            <button class="sort-btn ">⏱️ 2s polling</button>
            <button onClick={fetchAllUserStatuses} className="refresh-status-btn">🔄 REFRESH</button>
          </div> */}

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
                        src={userPictures[user.userId] || "/default-avatar.png"}
                        alt="Profile"
                        className="avatar-image"
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
                            title={user.isOnline ? 'Active now' : `Last active: ${formatLastActivity(user.lastActivity)}`}
                          >
                            {user.isOnline ? <div className="text-success">ONLINE</div> : getTimeAgoIST(user.lastActivity)}
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
          <div className="filters-section">
            <h3>Filters & Sorting</h3>
            <div className="filters-grid">
              <div className="filter-group">
                <label>Search:</label>
                <input type="text" name="search" value={filters.search} onChange={handleFilterChange} placeholder="Search by title or description" className="search-input" />
              </div>
              <div className="form-group">
                <label>Status:</label>
                <select className="custom-dropdown" value={filters.status} onChange={handleFilterChange}>
                  <option value="">All Status</option>
                  <option value="NEW">New</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="ON_HOLD">On Hold</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>
              <div className="form-group">
                <label>Priority:</label>
                <select className="custom-dropdown" value={filters.priority} onChange={handleFilterChange}>
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
            <button className={`tab ${activeTab === 'unassigned' ? 'active' : ''}`} onClick={() => setActiveTab('unassigned')}>UNASSIGNED TASKS ({filteredUnassignedTasks.length})</button>
            <button className={`tab ${activeTab === 'assigned' ? 'active' : ''}`} onClick={() => setActiveTab('assigned')}>ASSIGNED TASKS ({filteredAssignedTasks.length})</button>
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
                        <div className="priority-badge status">{getStatusBadge(task.status)}</div>
                      </div>
                      <p className="task-description" title={task.description}>{task.description}</p>
                      <div className="task-footer">
                        <span className="task-priority">Priority: <span class="priority-badge critical">{task.priority}</span></span>
                        <span className="task-deadline">  Due: <button class="view-tasks-btn">{task.deadline ? new Date(task.deadline).toLocaleDateString('en-GB') : 'No deadline'}</button></span>
                      </div>
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
                        <div className="priority-badge status">{getStatusBadge(task.status)}</div>
                      </div>
                      <p className="task-description" title={task.description}>{task.description}</p>
                      <div className="task-assignee"><strong>Assigned to: </strong><button class="view-tasks-btn">{task.assignedUser?.username || 'Unknown'}</button></div>
                      <div className="task-footer">
                        <span className="task-priority">Priority: <span class="priority-badge critical">{task.priority}</span></span>
                        <span className="task-deadline">  Due: <button class="view-tasks-btn">{task.deadline ? new Date(task.deadline).toLocaleDateString('en-GB') : 'No deadline'}</button></span>
                      </div>
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
                  ))}
                </div>
              )}
            </div>
          )}
            <div className="create-task-toggle">
              <button onClick={() => setShowCreateTask(true)} className="open-task-btn">
                ➕ Create Task
              </button>
            </div>
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
                    <select  className="custom-dropdown" value={newTask.priority} onChange={(e) => setNewTask({...newTask, priority: e.target.value})}>
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
      )}
      {showUserTasksModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowUserTasksModal(false)}>
          <div className="modal user-tasks-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Tasks for <button class="view-tasks-btn">{selectedUser.username}</button></h3>
              <button onClick={() => setShowUserTasksModal(false)} className="close-btn">x</button>
            </div>
            <div className="user-tasks-list">
              {userTasks.length === 0 ? <p className="no-tasks-message">No tasks assigned to this user</p> : userTasks.map(task => (
                <div key={task.id} className="user-task-item">
                  <div className="user-task-header">
                    <h4>{task.title}</h4>
                    <span className="priority-badge status">{task.status}</span>
                  </div>
                  <p className="user-task-description">{task.description}</p>
                  <div className="user-task-footer">
                    <span className="task-priority">Priority: <span class="priority-badge critical">{task.priority}</span></span>
                    <span className="task-deadline">  Due: <button class="view-tasks-btn">{task.deadline ? new Date(task.deadline).toLocaleDateString('en-GB') : 'No deadline'}</button></span>
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
              <div className="menu-item seperator" onClick={() => handleEditTask(contextMenu.task)}>Edit Task</div>
              <div className="menu-item delete" onClick={() => handleDeleteTask(contextMenu.task)}>Delete Task</div>
            </>
          ) : (
            <>
              <div className="menu-item" onClick={() => handleReassignTask(contextMenu.task)}>Reassign Task</div>
              <div className="menu-item seperator" onClick={() => handleUnassignTask(contextMenu.task)}>Unassign Task</div>
              <div className="menu-item seperator" onClick={() => handleEditTask(contextMenu.task)}>Edit Task</div>
              <div className="menu-item delete" onClick={() => handleDeleteTask(contextMenu.task)}>Delete Task</div>
            </>
          )}
        </div>
      )}

      {showAssignModal && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
            <div className="modal assign-modal" onClick={(e) => e.stopPropagation()}>
                <h3>Assign Task: {selectedTaskForAssign?.title}</h3>
                <p>Select a user to assign this task:</p>
                {UsersRole.length === 0 ? (
                    <div className="no-users-message">
                        <p>No users available</p>
                        <button onClick={fetchAllData} className="retry-btn">Refresh</button>
                    </div>
                ) : loading ? (
                    <p>Loading users...</p>
                ) : (
                    <div className="user-list">
                        {UsersRole
                            .filter((user) => user.role !== "ADMIN")
                            .map((user) => {
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
              <div className="modal assign-modal" onClick={(e) => e.stopPropagation()}>
                  <h3>Reassign Task: {selectedTaskForReassign?.title}</h3>
                  <p>Current assignee: <strong>{selectedTaskForReassign?.assignedUser?.username}</strong></p>
                  <br />
                  <h4>Select a new user:</h4>
                  {UsersRole.length === 0 ? (
                      <div className="no-users-message">
                          <p>No users available</p>
                          <button onClick={fetchAllData} className="retry-btn">Refresh</button>
                      </div>
                  ) : loading ? (
                      <p>Loading users...</p>
                  ) : (
                      <div className="user-list">
                          {UsersRole
                              .filter((user) => user.role !== "ADMIN")
                              .map((user) => {
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
            <div className="modal-actions">
              <button onClick={confirmUnassign} className="unassign-btn">Unassign</button>
              <button onClick={() => setShowUnassignConfirm(false)} className="cancel-btn">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && editingTask && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal edit-modal" onClick={e => e.stopPropagation()}>
            <h3>Edit Task</h3>
            <button className="close-btn-edit" onClick={() => setShowEditModal(false)}>x</button>
            <div className="form-group"><div className="assign-modal"><h4>Title:</h4></div><input type="text" value={editingTask.title} onChange={(e) => setEditingTask({...editingTask, title: e.target.value})} /></div>
            <br></br>
            <div className="form-group"><div className="assign-modal"><h4>Description:</h4></div><textarea value={editingTask.description} onChange={(e) => setEditingTask({...editingTask, description: e.target.value})} rows="3" /></div>
            <br></br>
            <div className="form-row">
              <div className="form-group"><div className="assign-modal"><h4>Priority:</h4></div><select value={editingTask.priority} onChange={(e) => setEditingTask({...editingTask, priority: e.target.value})} className="custom-dropdown"><option value="LOW">LOW</option><option value="MEDIUM">MEDIUM</option><option value="HIGH">HIGH</option><option value="CRITICAL">CRITICAL</option></select></div>
            <div className="form-group"><div className="assign-modal"><h4>Deadline:</h4></div><input type="date" value={editingTask.deadline?.split('T')[0]} onChange={(e) => setEditingTask({...editingTask, deadline: e.target.value})} /></div>
            </div>
            <br></br>
            <div className="form-group">
              <div className="assign-modal">
                <h4>Status:</h4>
              </div>
              <select
                value={editingTask.status}
                onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value })}
                className="custom-dropdown"
              >
                <option value="NEW">NEW</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="ON_HOLD">ON_HOLD</option>
                <option value="COMPLETED">COMPLETED</option>
              </select>
            </div>
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
            <div className="modal-actions"><button onClick={confirmDelete} className="delete-btn">Delete</button><button onClick={() => setShowDeleteConfirm(false)} className="cancel-btn">Cancel</button></div>
          </div>
        </div>
      )}

      {showTaskDetails && selectedTaskDetails && (
        <div
          className="modal-overlay"
          onClick={() => setShowTaskDetails(false)}
        >
          <div
            ref={taskDetailsRef}
            className="modal task-details-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ✅ Header */}
            <div className="modal-header">
              <h2 title={selectedTaskDetails.title}>
                {selectedTaskDetails.title}
              </h2>
              <button
                className="close-btn"
                onClick={() => setShowTaskDetails(false)}
              >
                ✕
              </button>
            </div>
            <hr />
            {/* Description */}
            <div className="detail-row-desc">
              <label>Description:</label>
              <h4>{selectedTaskDetails.description || "No description"}</h4>
            </div>

            {/* Priority */}
            <div className="detail-row">
              <label>Priority:</label>
              <span className="priority-badge critical">
                {selectedTaskDetails.priority}
              </span>
            </div>

            {/* Deadline */}
            <div className="detail-row">
              <label>Deadline:</label>
              <button className="view-tasks-btn">
                {selectedTaskDetails.deadline
                  ? new Date(selectedTaskDetails.deadline).toLocaleDateString('en-GB')
                  : "No deadline"}
              </button>
            </div>

            {/* Status */}
            <div className="detail-row">
              <label>Status:</label>
              <button className="priority-badge status">
                {getStatusBadge(selectedTaskDetails.status)}
              </button>
            </div>

            {/* Assigned */}
            {selectedTaskDetails.status !== "NEW" && (
              <div className="detail-row">
                <label>Assigned to:</label>
                <div className="assigned-info">
                  <button className="view-tasks-btn">
                    {selectedTaskDetails.assignedUser?.username || "Unknown"}
                  </button>
                  <span>ON </span>
                  <button className="view-tasks-btn">
                    {selectedTaskDetails.assignedAt
                      ? formatDateTime(selectedTaskDetails.assignedAt)
                      : "N/A"}
                  </button>
                </div>
              </div>
            )}

            {/* Progress */}
            <div className="detail-row">
              <label>Task Progress:</label>
            </div>

            <div className="task-progress-bar">
              <div
                className="task-progress-fill"
                style={{
                  width: `${selectedTaskDetails.completionPercentage || 0}%`,
                }}
              />
              <span className="progress-text">
                {selectedTaskDetails.completionPercentage || 0}%
              </span>
            </div>

            {/* Message History */}
            <div id="pdf-messages"
            style={{ marginTop: "15px" }}>
              <button
                className="msg-std-btn"
                onClick={() => {
                  fetchMessages(selectedTaskDetails.id);
                  setShowMessageHistory(true);
                }}
              >
                SHOW MESSAGE HISTORY
              </button>
            </div>
            <div className="report-icon" onClick={generateReport} role="button" title="GENERATE REPORT"></div>
          </div>
        </div>
      )}
      {/*HIDDEN DIV FOR REPORT GENERATION*/}
      <div
        id="pdf-content"
        style={{
          position: "absolute",
          top: "-9999px",
          left: "-9999px",
          width: "800px",
          background: "#0f0c29",
          color: "#ffffff",
          padding: "25px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        {/* ✅ TITLE */}
        <h2 style={{ textAlign: "center", marginBottom: "20px" }}>
          Task Report
        </h2>

        {/* ✅ TASK DETAILS CARD */}
        <div style={{
          border: "1px solid #ccc",
          borderRadius: "10px",
          padding: "15px",
          marginBottom: "20px"
        }}>
          <h3>{selectedTaskDetails?.title}</h3>

          <p><strong>Description:</strong> {selectedTaskDetails?.description || "N/A"}</p>
          <p><strong>Priority:</strong> {selectedTaskDetails?.priority}</p>
          <p><strong>Status:</strong> {selectedTaskDetails?.status}</p>
          <p><strong>Deadline:</strong> {
            selectedTaskDetails?.deadline
              ? new Date(selectedTaskDetails.deadline).toLocaleDateString("en-GB")
              : "N/A"
          }</p>

          <p><strong>Assigned To:</strong> {selectedTaskDetails?.assignedUser?.username || "N/A"}</p>
          <p><strong>Assigned On:</strong>{selectedTaskDetails?.assignedAt
                      ? formatDateTime(selectedTaskDetails?.assignedAt) : "N/A"}</p>
          <p><strong>Progress:</strong> {selectedTaskDetails?.completionPercentage || 0}%</p>
        </div>
        <div style={{
          fontWeight: "bold",
          fontSize: "larger",
          marginBottom: "10px",
          paddingBottom: "5px"
        }}>
          MESSAGE HISTORY
        </div>
        {/* ✅ MESSAGE HISTORY */}
        <div id="pdf-messages">
          {pdfMessages.length === 0 ? (
            <p>No messages available.</p>
          ) : (
            pdfMessages.map((msg, index) => (
              <div key={msg.id || index} style={{ padding: "6px 0" }}>
                <div style={{ color: "#fff" }}>
                  [{formatDateTime(msg.createdAt)}] [{msg.username}]
                </div>
                <div style={{ color: "#fff" }}>
                  {msg.message}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      {showMessageHistory && (
        <div className="modal-overlay" onClick={() => setShowMessageHistory(false)}>
          <div className="modal task-details-modal" onClick={e => e.stopPropagation()}>

            <div className="modal-header">
              <h2>Message History</h2>
              <button className="close-btn" onClick={() => setShowMessageHistory(false)}>x</button>
            </div>
            <hr></hr><br></br>
            <div style={{ maxHeight: "300px", overflowY: "auto" }}>
              {messages.length === 0 ? (
                <p>No messages available.</p>
              ) : (
                messages.map((msg) => (
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

export default AdminDashboard;