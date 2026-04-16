package com.example.taskmanager.service;

import com.example.taskmanager.model.Task;
import com.example.taskmanager.repository.TaskRepository;
import com.example.taskmanager.repository.UserRepository;
import com.example.taskmanager.dto.TaskDTO;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;
@Service
public class TaskService {
    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    public List<TaskDTO> getTasksByAssignedUserId(Long userId) {
        List<Task> tasks = taskRepository.findByAssignedUserId(userId);
        return tasks.stream().map(TaskDTO::new).collect(Collectors.toList());
    }

    public List<TaskDTO> getAllTasks() {
        List<Task> tasks = taskRepository.findAll();
        return tasks.stream().map(TaskDTO::new).collect(Collectors.toList());
    }

    // ✅ FIXED STATUS UPDATE
    public TaskDTO updateTaskStatus(Long taskId, String newStatus) {
        Task task = taskRepository.findById(taskId)
            .orElseThrow(() -> new RuntimeException("Task not found"));

        String oldStatus = task.getStatus();
        task.setStatus(newStatus);
        task.setUpdatedAt(LocalDateTime.now());

        Task updatedTask = taskRepository.save(task);

        // 🔔 Notify ASSIGNED USER (NOT creator)
        if (task.getAssignedUser() != null) {
            notificationService.createNotification(
                task.getAssignedUser(),
                "TASK_UPDATED",
                "Task status updated from " + oldStatus + " to " + newStatus +
                " for: " + task.getTitle(),
                task
            );
        }

        return new TaskDTO(updatedTask);
    }

    // ✅ NEW METHOD → ASSIGN / UNASSIGN USER
    public TaskDTO updateTaskAssignment(Long taskId, Long newUserId) {
        Task task = taskRepository.findById(taskId)
            .orElseThrow(() -> new RuntimeException("Task not found"));

        var oldUser = task.getAssignedUser();

        // ⚠️ You must fetch new user from UserRepository
        var newUser = (newUserId != null)
            ? userRepository.findById(newUserId).orElse(null)
            : null;

        task.setAssignedUser(newUser);

        Task updatedTask = taskRepository.save(task);

        // 🔔 UNASSIGNED
        if (oldUser != null && newUser == null) {
            notificationService.createNotification(
                oldUser,
                "TASK_UNASSIGNED",
                "You have been unassigned from task: " + task.getTitle(),
                task
            );
        }

        // 🔔 ASSIGNED
        if (newUser != null && (oldUser == null || !oldUser.getId().equals(newUser.getId()))) {
            notificationService.createNotification(
                newUser,
                "TASK_ASSIGNED",
                "You have been assigned a new task: " + task.getTitle(),
                task
            );
        }

        return new TaskDTO(updatedTask);
    }
}