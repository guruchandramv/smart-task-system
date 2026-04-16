package com.example.taskmanager.repository;
import com.example.taskmanager.model.User;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Query;


public interface UserRepository extends JpaRepository<User, Long> {
    // Find user by email (for login)
    Optional<User> findByEmail(String email);

    // Find online users who haven't had activity since cutoff time
    // Using @Query for explicit control
    @Query("SELECT u FROM User u WHERE u.isOnline = true AND u.lastActivity < :cutoff")
    List<User> findInactiveOnlineUsers(@Param("cutoff") LocalDateTime cutoff);

    // Count online users
    @Query("SELECT COUNT(u) FROM User u WHERE u.isOnline = true")
    long countByIsOnlineTrue();

    // Optional: Find all online users
    List<User> findByIsOnlineTrue();

    // Optional: Find all offline users
    List<User> findByIsOnlineFalse();

}