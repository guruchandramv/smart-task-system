package com.example.taskmanager.controller;

import com.example.taskmanager.model.Notification;
import com.example.taskmanager.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@CrossOrigin(origins = "http://localhost:3000")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    // Get all notifications
    @GetMapping
    public ResponseEntity<List<Notification>> getAllNotifications() {
        List<Notification> notifications = notificationService.getAllNotifications();
        return ResponseEntity.ok(notifications != null ? notifications : new ArrayList<>());
    }

    // Get unread notifications only
    @GetMapping("/unread")
    public ResponseEntity<?> getUnreadNotifications() {
        try {
            List<Notification> notifications = notificationService.getUnreadNotifications();
            return ResponseEntity.ok(notifications);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500)
                .body(Map.of("error", "Error fetching unread notifications: " + e.getMessage()));
        }
    }

    // Get unread count
    @GetMapping("/unread/count/{userId}")
    public ResponseEntity<?> getUnreadCount(@PathVariable Long userId) {
        long count = notificationService.getUnreadCountByUser(userId);
        return ResponseEntity.ok(Map.of("count", count));
    }

    // Mark notification as read
    @PutMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(@PathVariable Long id) {
        try {
            notificationService.markAsRead(id);
            return ResponseEntity.ok(Map.of("message", "Notification marked as read"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500)
                .body(Map.of("error", "Error marking notification as read: " + e.getMessage()));
        }
    }

    // Mark all as read
    @PutMapping("/read-all")
    public ResponseEntity<?> markAllAsRead() {
        try {
            notificationService.markAllAsRead();
            return ResponseEntity.ok(Map.of("message", "All notifications marked as read"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500)
                .body(Map.of("error", "Error marking all as read: " + e.getMessage()));
        }
    }

    // Get recent notifications (last 7 days)
    @GetMapping("/recent")
    public ResponseEntity<?> getRecentNotifications() {
        try {
            List<Notification> notifications = notificationService.getRecentNotifications();
            return ResponseEntity.ok(notifications);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500)
                .body(Map.of("error", "Error fetching recent notifications: " + e.getMessage()));
        }
    }
    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getNotificationsByUser(@PathVariable Long userId) {
        List<Notification> notifications = notificationService.getByUserId(userId);

        List<Map<String, Object>> response = notifications.stream()
    .map(n -> {
        Map<String, Object> map = new java.util.HashMap<>();
        map.put("id", n.getId());
        map.put("message", n.getMessage());
        map.put("status", n.getStatus());
        map.put("createdAt", n.getCreatedAt());
        return map;
    })
    .collect(java.util.stream.Collectors.toList());

        return ResponseEntity.ok(response);
    }
}