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
    // Helper method to clean message
    private String cleanMessage(String message) {
        return message.replaceAll("[^\\x20-\\x7E\\n\\r\\t]", "").trim();
    }
    public List<Notification> getByUserId(Long userId) {
        List<Notification> list = notificationRepository.findByUser_IdOrderByCreatedAtDesc(userId);
        for (Notification n : list) {
            //System.out.println("Notification ID: " + n.getId());

            try {
                /*if (n.getUser() != null) {
                    //System.out.println("User ID: " + n.getUser().getId());
                }

                if (n.getTask() != null) {
                    //System.out.println("Task ID: " + n.getTask().getId());
                }*/

            } catch (Exception e) {
                System.out.println("❌ Error in notification: " + n.getId());
                e.printStackTrace();
            }
        }

        return list;
    }
    // Create notification for task creation
    public void notifyTaskCreated(Task task, User admin) {
        Notification notification = new Notification();
        notification.setType("TASK_CREATED");
        String message = String.format("Task '%s' created by %s",
            task.getTitle(), admin.getUsername());
        notification.setMessage(cleanMessage(message));
        notification.setUser(admin);
        notification.setTask(task);
        notification.setStatus("UNREAD");
        notification.setCreatedAt(LocalDateTime.now());

        notificationRepository.save(notification);
        //System.out.println("✅ Notification stored: " + notification.getMessage());
    }

    // Create notification for task assignment
    public void notifyTaskAssigned(Task task, User assignedBy, User assignedTo) {
        Notification notification = new Notification();
        notification.setType("TASK_ASSIGNED");
        String message = String.format("Task '%s' assigned to %s by %s",
            task.getTitle(), assignedTo.getUsername(), assignedBy.getUsername());
        notification.setMessage(cleanMessage(message));
        notification.setUser(assignedBy);
        notification.setTask(task);
        notification.setStatus("UNREAD");
        notification.setCreatedAt(LocalDateTime.now());

        notificationRepository.save(notification);
        //System.out.println("✅ Notification stored: " + notification.getMessage());
    }

    // Create notification for task unassignment
    public void notifyTaskUnassigned(Task task, User unassignedBy, User previousUser) {
        Notification notification = new Notification();
        notification.setType("TASK_UNASSIGNED");
        String message = String.format("Task '%s' unassigned from %s by %s",
            task.getTitle(), previousUser.getUsername(), unassignedBy.getUsername());
        notification.setMessage(cleanMessage(message));
        notification.setUser(unassignedBy);
        notification.setTask(task);
        notification.setStatus("UNREAD");
        notification.setCreatedAt(LocalDateTime.now());

        notificationRepository.save(notification);
        //System.out.println("✅ Notification stored: " + notification.getMessage());
    }

    // Create notification for task update
    public void notifyTaskUpdated(Task task, User updatedBy, String field, String oldValue, String newValue) {
        Notification notification = new Notification();
        notification.setType("TASK_UPDATED");
        String message = String.format("Task '%s' updated: %s changed from '%s' to '%s' by %s",
            task.getTitle(), field, oldValue, newValue, updatedBy.getUsername());
        notification.setMessage(cleanMessage(message));
        notification.setUser(updatedBy);
        notification.setTask(task);
        notification.setOldValue(oldValue);
        notification.setNewValue(newValue);
        notification.setStatus("UNREAD");
        notification.setCreatedAt(LocalDateTime.now());

        notificationRepository.save(notification);
        //System.out.println("✅ Notification stored: " + notification.getMessage());
    }

    // Create notification for task deletion
    public void notifyTaskDeleted(String taskTitle, User deletedBy) {
        Notification notification = new Notification();
        notification.setType("TASK_DELETED");
        String message = String.format("Task '%s' deleted by %s",
            taskTitle, deletedBy.getUsername());
        notification.setMessage(cleanMessage(message));
        notification.setUser(deletedBy);
        notification.setStatus("UNREAD");
        notification.setCreatedAt(LocalDateTime.now());

        notificationRepository.save(notification);
        //System.out.println("✅ Notification stored: " + notification.getMessage());
    }

    // Create notification for task completion
    public void notifyTaskCompleted(Task task, User completedBy) {
        Notification notification = new Notification();
        notification.setType("TASK_COMPLETED");
        String message = String.format("Task '%s' completed by %s",
            task.getTitle(), completedBy.getUsername());
        notification.setMessage(cleanMessage(message));
        notification.setUser(completedBy);
        notification.setTask(task);
        notification.setStatus("UNREAD");
        notification.setCreatedAt(LocalDateTime.now());

        notificationRepository.save(notification);
        //System.out.println("✅ Notification stored: " + notification.getMessage());
    }

    // Get all notifications
    public List<Notification> getAllNotifications() {
        return notificationRepository.findAllByOrderByCreatedAtDesc();
    }

    // Get unread notifications
    public List<Notification> getUnreadNotifications() {
        return notificationRepository.findByStatusOrderByCreatedAtDesc("UNREAD");
    }

    // Get recent notifications (last 7 days)
    public List<Notification> getRecentNotifications() {
        return notificationRepository.findRecentNotifications();
    }

    // Mark notification as read
    public void markAsRead(Long notificationId) {
        notificationRepository.markAsRead(notificationId);
        //System.out.println("✅ Notification " + notificationId + " marked as read");
    }

    // Mark all as read
    public void markAllAsRead() {
        notificationRepository.markAllAsRead();
        //System.out.println("✅ All notifications marked as read");
    }

    // Get unread count
    public long getUnreadCount() {
        return notificationRepository.countUnread();
    }

}