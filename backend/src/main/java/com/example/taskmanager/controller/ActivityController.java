package com.example.taskmanager.controller;

import com.example.taskmanager.model.User;
import com.example.taskmanager.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.scheduling.annotation.Scheduled;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/activity")
@CrossOrigin(origins = "http://localhost:3000")
public class ActivityController {

    @Autowired
    private UserRepository userRepository;

    /**
     * Update user activity heartbeat
     * Called every 2 seconds from frontend for ultra-fast updates
     */
    @PostMapping("/heartbeat")
    public ResponseEntity<?> updateHeartbeat(@RequestParam Long userId) {
        try {
            User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
            
            LocalDateTime now = LocalDateTime.now();
            user.setLastActivity(now);
            user.setOnline(true);
            userRepository.save(user);
            
            // Log heartbeat for debugging (optional - remove in production)
            System.out.println("💓 Heartbeat from user: " + user.getUsername() + " at " + now.toLocalTime());
            
            return ResponseEntity.ok(Map.of(
                "status", "online",
                "timestamp", now.toString(),
                "userId", userId
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Get single user status with last login details
     */
    @GetMapping("/user-status/{userId}")
    public ResponseEntity<?> getUserStatus(@PathVariable Long userId) {
        try {
            User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
            
            Map<String, Object> status = new HashMap<>();
            status.put("userId", user.getId());
            status.put("username", user.getUsername());
            status.put("email", user.getEmail());
            status.put("isOnline", user.getIsOnline());
            status.put("lastLogin", user.getLastLogin());
            status.put("lastActivity", user.getLastActivity());
            
            // Calculate inactive seconds
            if (user.getLastActivity() != null) {
                long inactiveSeconds = ChronoUnit.SECONDS.between(user.getLastActivity(), LocalDateTime.now());
                status.put("inactiveSeconds", inactiveSeconds);
            }
            
            return ResponseEntity.ok(status);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Get all users with their online status - ULTRA-FAST 5-SECOND TIMEOUT
     * Users are considered offline if no heartbeat in last 5 seconds
     */
    @GetMapping("/all-status")
public ResponseEntity<?> getAllUsersStatus() {
    try {
        List<User> users = userRepository.findAll();
        LocalDateTime now = LocalDateTime.now();
        
        AtomicInteger markedOffline = new AtomicInteger(0);
        AtomicInteger onlineCount = new AtomicInteger(0);
        
        List<Map<String, Object>> userStatuses = users.stream().map(user -> {
            Map<String, Object> status = new HashMap<>();
            status.put("userId", user.getId());
            status.put("username", user.getUsername());
            status.put("email", user.getEmail());
            status.put("lastLogin", user.getLastLogin());
            status.put("lastActivity", user.getLastActivity());
            
            // DEBUG LOG - Print each user's lastActivity
            System.out.println("📋 User " + user.getUsername() + 
                " lastActivity: " + user.getLastActivity());
            
            boolean isOnline = false;
            if (user.getLastActivity() != null) {
                long secondsInactive = ChronoUnit.SECONDS.between(user.getLastActivity(), now);
                status.put("inactiveSeconds", secondsInactive);
                
                if (secondsInactive <= 2) {
                    isOnline = true;
                    onlineCount.incrementAndGet();
                } else {
                    if (user.getIsOnline()) {
                        markedOffline.incrementAndGet();
                        user.setOnline(false);
                        System.out.println("🔴 User " + user.getUsername() + " went offline - inactive for " + secondsInactive + " seconds");
                    }
                }
            } else {
                status.put("inactiveSeconds", null);
            }
            
            status.put("isOnline", isOnline);
            
            return status;
        }).collect(Collectors.toList());
        
        // Batch save all updated users (those marked offline)
        if (markedOffline.get() > 0) {
            userRepository.saveAll(users.stream()
                .filter(user -> !user.getIsOnline() && user.getLastActivity() != null)
                .collect(Collectors.toList()));
            
            System.out.println("🔴 FAST TIMEOUT: " + markedOffline.get() + 
                " users marked offline at " + now.toLocalTime() + 
                " (inactive > 5s)");
        }
        
        System.out.println("📊 Status check: " + onlineCount.get() + " online, " + 
            (users.size() - onlineCount.get()) + " offline at " + now.toLocalTime());
        
        return ResponseEntity.ok(userStatuses);
    } catch (Exception e) {
        e.printStackTrace();
        return ResponseEntity.badRequest()
            .body(Map.of("error", "Failed to fetch user statuses: " + e.getMessage()));
    }
}
    /**
     * Scheduled task to aggressively mark inactive users offline every 3 seconds
     * This ensures users are marked offline even if they don't call all-status
     */
    @Scheduled(fixedRate = 1000) // Run every 1 seconds for ultra-fast cleanup
    public void markInactiveUsersOffline() {
        try {
            // FAST: 2 seconds threshold
            LocalDateTime cutoff = LocalDateTime.now().minusSeconds(2);
            
            // Find users who are marked online but haven't had activity in 2+ seconds
            List<User> inactiveUsers = userRepository.findInactiveOnlineUsers(cutoff);
            
            if (!inactiveUsers.isEmpty()) {
                for (User user : inactiveUsers) {
                    user.setOnline(false);
                    System.out.println("🔴 SCHEDULED CLEANUP: User '" + user.getUsername() + 
                        "' (ID: " + user.getId() + ") marked offline - last activity: " + 
                        user.getLastActivity() + " (>2s ago)");
                }
                
                userRepository.saveAll(inactiveUsers);
                System.out.println("✅ Cleanup complete: " + inactiveUsers.size() + " users marked offline");
            }
        } catch (Exception e) {
            System.err.println("❌ Error in scheduled cleanup: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Explicit logout endpoint - called when user clicks logout button
     */
    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestParam Long userId) {
        try {
            User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
            LocalDateTime now = LocalDateTime.now();
            System.out.println("🔴 Logout at: " + now);
            user.setOnline(false);
            user.setLastActivity(LocalDateTime.now());
            userRepository.save(user);
            
            System.out.println("🚪 User '" + user.getUsername() + "' logged out explicitly at " + 
                LocalDateTime.now().toLocalTime());
            
            User savedUser = userRepository.findById(userId).get();
            System.out.println("✅ Saved lastActivity: " + savedUser.getLastActivity());

            return ResponseEntity.ok(Map.of(
                "status", "logged out",
                "userId", userId,
                "timestamp", LocalDateTime.now().toString()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Force cleanup endpoint - can be called manually by admin to mark all stale users offline
     */
    @PostMapping("/force-cleanup")
    public ResponseEntity<?> forceCleanup() {
        try {
            LocalDateTime now = LocalDateTime.now();
            LocalDateTime cutoff = now.minusSeconds(2);
            
            List<User> inactiveUsers = userRepository.findInactiveOnlineUsers(cutoff);
            int markedOffline = inactiveUsers.size();
            
            for (User user : inactiveUsers) {
                user.setOnline(false);
                System.out.println("🔴 FORCE CLEANUP: User '" + user.getUsername() + 
                    "' marked offline (inactive since " + user.getLastActivity() + ")");
            }
            
            if (!inactiveUsers.isEmpty()) {
                userRepository.saveAll(inactiveUsers);
            }
            
            // Get counts for response
            long totalUsers = userRepository.count();
            long onlineUsers = userRepository.countByIsOnlineTrue();
            
            return ResponseEntity.ok(Map.of(
                "status", "cleanup completed",
                "usersMarkedOffline", markedOffline,
                "totalUsers", totalUsers,
                "onlineUsers", onlineUsers,
                "offlineUsers", totalUsers - onlineUsers,
                "timestamp", now.toString()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Get online/offline statistics
     */
    @GetMapping("/stats")
    public ResponseEntity<?> getOnlineStats() {
        try {
            long totalUsers = userRepository.count();
            long onlineUsers = userRepository.countByIsOnlineTrue();
            
            return ResponseEntity.ok(Map.of(
                "totalUsers", totalUsers,
                "onlineUsers", onlineUsers,
                "offlineUsers", totalUsers - onlineUsers,
                "timestamp", LocalDateTime.now().toString()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", e.getMessage()));
        }
    }
}