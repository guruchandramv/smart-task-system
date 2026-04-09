package com.example.taskmanager.repository;

import com.example.taskmanager.model.Notification;
import com.example.taskmanager.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    // Find all notifications for admin (all users)
    List<Notification> findAllByOrderByCreatedAtDesc();

    // Find unread notifications
    List<Notification> findByStatusOrderByCreatedAtDesc(String status);

    // Find notifications by user
    List<Notification> findByUserOrderByCreatedAtDesc(User user);

    // Find recent notifications (last 7 days)
    @Query("SELECT n FROM Notification n WHERE n.createdAt >= CURRENT_DATE - 7 ORDER BY n.createdAt DESC")
    List<Notification> findRecentNotifications();

    // Mark notification as read
    @Modifying
    @Transactional
    @Query("UPDATE Notification n SET n.status = 'READ' WHERE n.id = :id")
    void markAsRead(@Param("id") Long id);

    // Mark all notifications as read
    @Modifying
    @Transactional
    @Query("UPDATE Notification n SET n.status = 'READ' WHERE n.status = 'UNREAD'")
    void markAllAsRead();

    // Count unread notifications
    @Query("SELECT COUNT(n) FROM Notification n WHERE n.status = 'UNREAD'")
    long countUnread();
    List<Notification> findByUser_Id(Long userId);
}