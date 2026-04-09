package com.example.taskmanager.controller;
import java.sql.Connection;
import java.sql.DriverManager;
import com.example.taskmanager.model.Task;
import com.example.taskmanager.model.User;
import com.example.taskmanager.repository.TaskRepository;
import com.example.taskmanager.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.Optional;
import java.util.List;
import com.example.taskmanager.service.NotificationService;
import com.example.taskmanager.service.TaskService;

import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/tasks")
@CrossOrigin(origins = "http://localhost:3000")
public class TaskController {
    @Autowired
    private NotificationService notificationService;
    @Autowired
    private TaskService taskService;
    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private UserRepository userRepository;

    /**
     * GET all tasks
     * Endpoint: GET /api/tasks
     */
    @GetMapping
    public ResponseEntity<?> getAllTasks() {
        try {
            System.out.println("Fetching all tasks...");
            List<Task> tasks = taskRepository.findAll();
            System.out.println("Found " + tasks.size() + " tasks");
            return ResponseEntity.ok(tasks);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500)
                .body(Map.of("error", "Error fetching tasks: " + e.getMessage()));
        }
    }
    /**
     * GET test DB
     * Endpoint: GET /api/tasks/test-db
     */
    @GetMapping("/test-db")
    public String testDatabase() {
        try {
            Class.forName("org.postgresql.Driver");
            String url =  "jdbc:postgresql://ep-noisy-fog-a1chnaai-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
            String user = "neondb_owner";
            String pass = "npg_63RoatjmPysn";

            Connection conn = DriverManager.getConnection(url, user, pass);
            conn.close();
            return "✅ Database connection successful!";
        } catch (Exception e) {
            return "❌ Database connection failed: " + e.getMessage();
        }
    }

    /**
     * GET unassigned tasks (status = NEW)
     * Endpoint: GET /api/tasks/unassigned
     */
    @GetMapping("/unassigned")
    public ResponseEntity<?> getUnassignedTasks() {
        try {
            System.out.println("Fetching unassigned tasks...");
            List<Task> unassignedTasks = taskRepository.findByStatus("NEW");
            System.out.println("Found " + unassignedTasks.size() + " unassigned tasks");
            return ResponseEntity.ok(unassignedTasks);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500)
                .body(Map.of("error", "Error fetching unassigned tasks: " + e.getMessage()));
        }
    }

    /**
     * GET tasks by user ID
     * Endpoint: GET /api/tasks/user/{userId}
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getTasksByUser(@PathVariable Long userId) {
        try {
            System.out.println("Fetching tasks for user: " + userId);
            List<Task> tasks = taskRepository.findByAssignedUserId(userId);
            System.out.println("Found " + tasks.size() + " tasks for user");
            return ResponseEntity.ok(tasks);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500)
                .body(Map.of("error", "Error fetching user tasks: " + e.getMessage()));
        }
    }

    /**
     * GET task by ID
     * Endpoint: GET /api/tasks/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getTaskById(@PathVariable Long id) {
        try {
            System.out.println("Fetching task with ID: " + id);
            Optional<Task> task = taskRepository.findById(id);
            if (task.isPresent()) {
                return ResponseEntity.ok(task.get());
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500)
                .body(Map.of("error", "Error fetching task: " + e.getMessage()));
        }
    }
    @PutMapping("/tasks/{id}/updateCompletion")
    public ResponseEntity<Task> updateTaskCompletion(@PathVariable Long id, @RequestParam int completionPercentage) {
        Optional<Task> taskOptional = taskRepository.findById(id);
        if (!taskOptional.isPresent()) {
            return ResponseEntity.notFound().build();
        }

        Task task = taskOptional.get();
        // int oldPercentage = task.getCompletionPercentage();
        task.setCompletionPercentage(completionPercentage);

        // Update task in DB
        taskRepository.save(task);

        // Notify admin about the completion percentage change
        // notificationService.notifyTaskCompletionUpdated(task, task.getAssignedUser(), oldPercentage, completionPercentage);

        return ResponseEntity.ok(task);
    }
    /**
     * POST create new task
     * Endpoint: POST /api/tasks
     */
    @PostMapping
    public ResponseEntity<?> createTask(@RequestBody Map<String, Object> taskPayload) {
        try {
            System.out.println("📝 Creating new unassigned task: " + taskPayload);

            // Get admin user
            Optional<User> adminUser = userRepository.findById(1L);
            if (!adminUser.isPresent()) {
                List<User> admins = userRepository.findAll().stream()
                    .filter(u -> "ADMIN".equals(u.getRole()))
                    .collect(Collectors.toList());
                if (!admins.isEmpty()) {
                    adminUser = Optional.of(admins.get(0));
                }
            }

            if (!adminUser.isPresent()) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "No admin user found"));
            }

            // Validate required fields
            String title = (String) taskPayload.get("title");
            if (title == null || title.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "Title is required"));
            }

            // Create new task
            Task task = new Task();
            task.setTitle(title);
            task.setDescription((String) taskPayload.getOrDefault("description", ""));
            task.setStatus("NEW");
            task.setPriority((String) taskPayload.getOrDefault("priority", "MEDIUM"));

            // Parse deadline
            String deadlineStr = (String) taskPayload.get("deadline");
            if (deadlineStr != null && !deadlineStr.isEmpty()) {
                try {
                    if (!deadlineStr.contains("T")) {
                        deadlineStr = deadlineStr + "T00:00:00";
                    }
                    task.setDeadline(LocalDateTime.parse(deadlineStr, DateTimeFormatter.ISO_LOCAL_DATE_TIME));
                } catch (Exception e) {
                    task.setDeadline(LocalDateTime.now().plusDays(7));
                }
            } else {
                task.setDeadline(LocalDateTime.now().plusDays(7));
            }

            task.setAssignedUser(null);
            task.setCreatedBy(adminUser.get());

            Task savedTask = taskRepository.save(task);
            System.out.println("✅ Task created with ID: " + savedTask.getId());

            // 🔔 CREATE NOTIFICATION
            notificationService.notifyTaskCreated(savedTask, adminUser.get());

            return ResponseEntity.status(201).body(savedTask);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Failed to create task: " + e.getMessage()));
        }
    }
    @PutMapping("/api/tasks/{id}")
public ResponseEntity<?> updateTaskStatus(@PathVariable Long id, @RequestBody Task task) {
    try {
        Task existingTask = taskService.updateTaskStatus(id, task);
        return ResponseEntity.ok(existingTask);
    } catch (Exception e) {
        // Log the error for debugging
        e.printStackTrace();
        return ResponseEntity.status(500).body(Map.of("error", "Error updating task status", "message", e.getMessage()));
    }
}
    /**
     * PUT update task
     * Endpoint: PUT /api/tasks/{taskId}
     */
    @PutMapping("/{taskId}")
    public ResponseEntity<?> updateTask(@PathVariable Long taskId, @RequestBody Map<String, Object> taskPayload) {
        try {
            System.out.println("Updating task: " + taskId);
            Optional<Task> taskOptional = taskRepository.findById(taskId);

            if (!taskOptional.isPresent()) {
                return ResponseEntity.notFound().build();
            }

            Task task = taskOptional.get();

            // Track changes for notifications
            String oldTitle = task.getTitle();
            String oldDescription = task.getDescription();
            String oldPriority = task.getPriority();
            String oldStatus = task.getStatus();
            LocalDateTime oldDeadline = task.getDeadline();

            String title = (String) taskPayload.get("title");
            if (title != null && !title.equals(oldTitle)) {
                task.setTitle(title);
                notificationService.notifyTaskUpdated(task, task.getCreatedBy(), "title", oldTitle, title);
            }

            String description = (String) taskPayload.get("description");
            if (description != null && !description.equals(oldDescription)) {
                task.setDescription(description);
                notificationService.notifyTaskUpdated(task, task.getCreatedBy(), "description", oldDescription, description);
            }

            String priority = (String) taskPayload.get("priority");
            if (priority != null && !priority.equals(oldPriority)) {
                task.setPriority(priority);
                notificationService.notifyTaskUpdated(task, task.getCreatedBy(), "priority", oldPriority, priority);
            }

            String status = (String) taskPayload.get("status");
            if (status != null && !status.equals(oldStatus)) {
                task.setStatus(status);
                notificationService.notifyTaskUpdated(task, task.getCreatedBy(), "status", oldStatus, status);

                // If status is COMPLETED, create completion notification
                if ("COMPLETED".equals(status)) {
                    notificationService.notifyTaskCompleted(task, task.getAssignedUser() != null ?
                        task.getAssignedUser() : task.getCreatedBy());
                }
            }

            String deadlineStr = (String) taskPayload.get("deadline");
            if (deadlineStr != null && !deadlineStr.isEmpty()) {
                try {
                    if (!deadlineStr.contains("T")) {
                        deadlineStr = deadlineStr + "T00:00:00";
                    }
                    LocalDateTime newDeadline = LocalDateTime.parse(deadlineStr, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
                    if (!newDeadline.equals(oldDeadline)) {
                        task.setDeadline(newDeadline);
                        notificationService.notifyTaskUpdated(task, task.getCreatedBy(), "deadline",
                            oldDeadline != null ? oldDeadline.toString() : "none", deadlineStr);
                    }
                } catch (Exception e) {
                    // Keep existing deadline
                }
            }

            Task updatedTask = taskRepository.save(task);
            return ResponseEntity.ok(updatedTask);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500)
                .body(Map.of("error", "Error updating task: " + e.getMessage()));
        }
    }

    /**
     * PUT assign task to user
     * Endpoint: PUT /api/tasks/{taskId}/assign/{userId}
     */
/**
 * PUT assign task to user
 * Endpoint: PUT /api/tasks/{taskId}/assign/{userId}
 */
@PutMapping("/{taskId}/assign/{userId}")
public ResponseEntity<?> assignTask(@PathVariable Long taskId, @PathVariable Long userId) {
    try {
        System.out.println("Assigning task " + taskId + " to user " + userId);

        Optional<Task> taskOptional = taskRepository.findById(taskId);
        Optional<User> userOptional = userRepository.findById(userId);

        if (!taskOptional.isPresent()) {
            return ResponseEntity.notFound().build();
        }
        if (!userOptional.isPresent()) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "User not found with id: " + userId));
        }

        Task task = taskOptional.get();
        User userToAssign = userOptional.get();

        // FIX: Get the ACTUAL ADMIN user who is performing this action
        // Method 1: Get from database (find first admin)
        User adminUser = userRepository.findAll().stream()
            .filter(u -> "ADMIN".equals(u.getRole()))
            .findFirst()
            .orElseThrow(() -> new RuntimeException("No admin user found"));

        // Method 2: Better approach - get from token/session (implement this later)
        // User adminUser = getCurrentUser();

        // Store previous user for logging
        User previousUser = task.getAssignedUser();

        // Assign the task
        task.setAssignedUser(userToAssign);
        task.setStatus("IN_PROGRESS");

        Task updatedTask = taskRepository.save(task);
        System.out.println("✅ Task assigned successfully by admin: " + adminUser.getUsername());

        // FIX: Use the CORRECT admin user in notification
        if (previousUser == null) {
            // First time assignment
            notificationService.notifyTaskAssigned(updatedTask, adminUser, userToAssign);
            System.out.println("✅ Notification: Task assigned to " + userToAssign.getUsername() +
                             " by admin " + adminUser.getUsername());
        } else {
            // Reassignment
            notificationService.notifyTaskAssigned(updatedTask, adminUser, userToAssign);
            System.out.println("✅ Notification: Task reassigned from " + previousUser.getUsername() +
                             " to " + userToAssign.getUsername() + " by admin " + adminUser.getUsername());
        }

        // Return the updated task
        Optional<Task> refreshedTask = taskRepository.findById(updatedTask.getId());
        if (refreshedTask.isPresent()) {
            Task result = refreshedTask.get();
            return ResponseEntity.ok(result);
        }

        return ResponseEntity.ok(updatedTask);

    } catch (Exception e) {
        e.printStackTrace();
        return ResponseEntity.status(500)
            .body(Map.of("error", "Error assigning task: " + e.getMessage()));
    }
}
    /**
 * PUT unassign task (move back to unassigned queue)
 * Endpoint: PUT /api/tasks/{taskId}/unassign
 */
@PutMapping("/{taskId}/unassign")
public ResponseEntity<?> unassignTask(@PathVariable Long taskId) {
    try {
        System.out.println("Unassigning task " + taskId);

        Optional<Task> taskOptional = taskRepository.findById(taskId);

        if (!taskOptional.isPresent()) {
            return ResponseEntity.notFound().build();
        }

        Task task = taskOptional.get();

        if (task.getAssignedUser() == null) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Task is not assigned to any user"));
        }

        User previousUser = task.getAssignedUser();

        // FIX: Get the ACTUAL ADMIN user
        User adminUser = userRepository.findAll().stream()
            .filter(u -> "ADMIN".equals(u.getRole()))
            .findFirst()
            .orElseThrow(() -> new RuntimeException("No admin user found"));

        // Unassign the task
        task.setAssignedUser(null);
        task.setStatus("NEW");

        Task updatedTask = taskRepository.save(task);
        System.out.println("✅ Task " + taskId + " unassigned by admin: " + adminUser.getUsername());

        // FIX: Use the CORRECT admin user in notification
        notificationService.notifyTaskUnassigned(updatedTask, adminUser, previousUser);
        System.out.println("✅ Notification: Task unassigned from " + previousUser.getUsername() +
                         " by admin " + adminUser.getUsername());

        return ResponseEntity.ok(updatedTask);

    } catch (Exception e) {
        e.printStackTrace();
        return ResponseEntity.status(500)
            .body(Map.of("error", "Error unassigning task: " + e.getMessage()));
    }
}
    /**
     * DELETE task
     * Endpoint: DELETE /api/tasks/{taskId}
     */
    @DeleteMapping("/{taskId}")
public ResponseEntity<?> deleteTask(@PathVariable Long taskId) {
    try {
        System.out.println("Deleting task: " + taskId);

        Optional<Task> taskOptional = taskRepository.findById(taskId);
        if (!taskOptional.isPresent()) {
            return ResponseEntity.notFound().build();
        }

        Task task = taskOptional.get();
        String taskTitle = task.getTitle();
        User deletedBy = task.getCreatedBy();

        taskRepository.deleteById(taskId);
        System.out.println("✅ Task deleted successfully");

        // 🔔 CREATE NOTIFICATION
        notificationService.notifyTaskDeleted(taskTitle, deletedBy);

        return ResponseEntity.ok(Map.of(
            "message", "Task deleted successfully",
            "id", taskId
        ));

    } catch (Exception e) {
        e.printStackTrace();
        return ResponseEntity.status(500)
            .body(Map.of("error", "Error deleting task: " + e.getMessage()));
    }
}
    /**
 * GET tasks assigned to a specific user (assigned endpoint for frontend)
 * Endpoint: GET /api/tasks/assigned/{userId}
 */
@GetMapping("/assigned/{userId}")
public ResponseEntity<?> getAssignedTasksByUser(@PathVariable Long userId) {
    try {
        System.out.println("Fetching assigned tasks for user ID: " + userId);

        // Verify user exists
        Optional<User> userOptional = userRepository.findById(userId);
        if (!userOptional.isPresent()) {
            return ResponseEntity.status(404)
                .body(Map.of("error", "User not found with id: " + userId));
        }

        // Get all tasks for this user
        List<Task> tasks = taskRepository.findByAssignedUserId(userId);

        // Filter out NEW status tasks in the response (or let frontend handle it)
        System.out.println("Found " + tasks.size() + " total tasks for user " + userId);

        // Optional: You can also filter here
        // List<Task> filteredTasks = tasks.stream()
        //     .filter(task -> !"NEW".equals(task.getStatus()))
        //     .collect(Collectors.toList());

        return ResponseEntity.ok(tasks);

    } catch (Exception e) {
        e.printStackTrace();
        return ResponseEntity.status(500)
            .body(Map.of("error", "Error fetching assigned tasks: " + e.getMessage()));
    }
}
}