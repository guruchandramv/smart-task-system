package com.example.taskmanager.service;

import com.example.taskmanager.model.Notification;
import com.example.taskmanager.model.Task;
import com.example.taskmanager.model.User;
import com.example.taskmanager.repository.NotificationRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
@Service
public class NotificationService {

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    private String cleanMessage(String message) {
        return message.replaceAll("[^\\x20-\\x7E\\n\\r\\t]", "").trim();
    }

    // 🔹 COMMON METHOD (IMPORTANT - reuse everywhere)
    public void createNotification(User user, String type, String message, Task task) {
        if (user == null) return;

        Notification notification = new Notification();
        notification.setType(type);
        notification.setMessage(cleanMessage(message));
        notification.setUser(user);
        notification.setTask(task);
        notification.setStatus("UNREAD");
        notification.setCreatedAt(LocalDateTime.now());

        notificationRepository.save(notification);

        // 🚀 OPTIONAL: Real-time push
        try {
            messagingTemplate.convertAndSendToUser(
                user.getUsername(),
                "/queue/notifications",
                notification.getMessage()
            );
        } catch (Exception e) {
            System.out.println("⚠️ WebSocket push failed");
        }
    }

    // 🔹 TASK CREATED → notify admin only
    public void notifyTaskCreated(Task task, User admin) {
        createNotification(
            admin,
            "TASK_CREATED",
            "Task '" + task.getTitle() + "' created",
            task
        );
    }

    // 🔹 TASK ASSIGNED → notify assigned user
    public void notifyTaskAssigned(Task task, User assignedBy, User assignedTo) {
        createNotification(
            assignedTo, // ✅ FIXED
            "TASK_ASSIGNED",
            "You have been assigned task: " + task.getTitle(),
            task
        );
    }

    // 🔹 TASK UNASSIGNED → notify previous user
    public void notifyTaskUnassigned(Task task, User unassignedBy, User previousUser) {
        createNotification(
            previousUser, // ✅ FIXED
            "TASK_UNASSIGNED",
            "You have been unassigned from task: " + task.getTitle(),
            task
        );
    }

    // 🔹 TASK UPDATED → notify assigned user
    public void notifyTaskUpdated(Task task, User updatedBy, String field, String oldValue, String newValue) {

        if (task.getAssignedUser() == null) return;

        createNotification(
            task.getAssignedUser(), // ✅ FIXED
            "TASK_UPDATED",
            "Task '" + task.getTitle() + "' updated: " + field +
            " changed from '" + oldValue + "' to '" + newValue + "'",
            task
        );
    }

    // 🔹 TASK DELETED → notify assigned user
    public void notifyTaskDeleted(Task task, User deletedBy) {
        if (task.getAssignedUser() == null) return;

        createNotification(
            task.getAssignedUser(),
            "TASK_DELETED",
            "Task '" + task.getTitle() + "' was deleted",
            task
        );
    }

    // 🔹 TASK COMPLETED → notify creator/admin
    public void notifyTaskCompleted(Task task, User completedBy) {
        createNotification(
            task.getCreatedBy(),
            "TASK_COMPLETED",
            "Task '" + task.getTitle() + "' completed",
            task
        );
    }

    // 🔹 FETCH METHODS (unchanged)
    public List<Notification> getByUserId(Long userId) {
        return notificationRepository.findByUser_IdOrderByCreatedAtDesc(userId);
    }

    public List<Notification> getAllNotifications() {
        return notificationRepository.findAllByOrderByCreatedAtDesc();
    }

    public List<Notification> getUnreadNotifications() {
        return notificationRepository.findByStatusOrderByCreatedAtDesc("UNREAD");
    }

    public List<Notification> getRecentNotifications() {
        return notificationRepository.findRecentNotifications();
    }

    public void markAsRead(Long notificationId) {
        notificationRepository.markAsRead(notificationId);
    }

    public void markAllAsRead() {
        notificationRepository.markAllAsRead();
    }

    public long getUnreadCount() {
        return notificationRepository.countUnread();
    }
}