package com.example.taskmanager.service;

import com.example.taskmanager.model.Notification;
import com.example.taskmanager.model.Task;
import com.example.taskmanager.model.User;
import com.example.taskmanager.repository.NotificationRepository;

import java.time.format.DateTimeFormatter;
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

    // 🔥 CENTRAL METHOD
    public void createNotification(User user, String type, String message, Task task) {
        if (user == null) return;

        Notification notification = new Notification();
        notification.setType(type);
        notification.setMessage(cleanMessage(message));
        notification.setUser(user);
        notification.setTask(task);
        notification.setStatus("UNREAD");
        notification.setCreatedAt(LocalDateTime.now());

        Notification saved = notificationRepository.save(notification);

        // ✅ Send FULL object (not just message)
        try {
            messagingTemplate.convertAndSendToUser(
                user.getUsername(),
                "/queue/notifications",
                saved
            );
        } catch (Exception e) {
            System.out.println("⚠️ WebSocket push failed");
        }
    }

    // 🔹 TASK CREATED → notify admin
    public void notifyTaskCreated(Task task, User admin) {
        createNotification(
            admin,
            "TASK_CREATED",
            "Task '" + task.getTitle() + "' created",
            task
        );
    }

    // 🔹 TASK ASSIGNED → notify BOTH user & admin
    public void notifyTaskAssigned(Task task, User assignedBy, User assignedTo) {

        // ✅ Notify assigned user
        createNotification(
            assignedTo,
            "TASK_ASSIGNED",
            "You have been assigned task: " + task.getTitle(),
            task
        );

        // ✅ Notify admin
        createNotification(
            assignedBy,
            "TASK_ASSIGNED",
            "Task '" + task.getTitle() + "' assigned to " + assignedTo.getUsername(),
            task
        );
    }

    // 🔹 TASK UNASSIGNED → notify BOTH
    public void notifyTaskUnassigned(Task task, User unassignedBy, User previousUser) {

        // ✅ User
        createNotification(
            previousUser,
            "TASK_UNASSIGNED",
            "You have been unassigned from task: " + task.getTitle(),
            task
        );

        // ✅ Admin
        createNotification(
            unassignedBy,
            "TASK_UNASSIGNED",
            "Task '" + task.getTitle() + "' unassigned from " + previousUser.getUsername(),
            task
        );
    }
    private String formatIfDateTime(String value, DateTimeFormatter formatter) {
        try {
            if (value == null) return "N/A";

            // Try parsing ISO format
            return java.time.LocalDateTime.parse(value)
                    .format(formatter);

        } catch (Exception e) {
            // If not a datetime → return as is
            return value;
        }
    }
    // 🔹 TASK UPDATED → notify assigned user
    public void notifyTaskUpdated(Task task, User updatedBy, String field, String oldValue, String newValue) {

        if (task.getAssignedUser() == null) return;

        // 🔥 Formatter (12-hour format)
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("DD-MMM-YYYY");

        // 🔥 Convert values if they are datetime strings
        oldValue = formatIfDateTime(oldValue, formatter);
        newValue = formatIfDateTime(newValue, formatter);

        createNotification(
            task.getAssignedUser(),
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

    // ================= FETCH =================

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

    // 🔥 FIXED: user-specific unread count
    public long getUnreadCountByUser(Long userId) {
        return notificationRepository.countByUserIdAndStatus(userId, "UNREAD");
    }
}