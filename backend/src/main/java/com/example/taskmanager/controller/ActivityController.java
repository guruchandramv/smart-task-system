package com.example.taskmanager.controller;

import com.example.taskmanager.model.User;
import com.example.taskmanager.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/activity")
@CrossOrigin(origins = "http://localhost:3000")
public class ActivityController {

    @Autowired
    private UserRepository userRepository;

    private final DateTimeFormatter isoFormatter = DateTimeFormatter.ISO_INSTANT;

    // ----------------- Heartbeat -----------------
    @PostMapping("/heartbeat")
    public ResponseEntity<?> updateHeartbeat(@RequestParam Long userId) {
        try {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

            Instant nowUtc = Instant.now();
            user.setLastActivity(nowUtc.atOffset(ZoneOffset.UTC).toLocalDateTime()); // store UTC
            user.setOnline(true);
            userRepository.save(user);

            return ResponseEntity.ok(Map.of(
                    "status", "online",
                    "timestamp", isoFormatter.format(nowUtc), // send ISO UTC
                    "userId", userId
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ----------------- Single User Status -----------------
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

            // Convert lastLogin & lastActivity to ISO UTC strings
            if (user.getLastLogin() != null) {
                status.put("lastLogin", isoFormatter.format(user.getLastLogin().atOffset(ZoneOffset.UTC).toInstant()));
            } else {
                status.put("lastLogin", null);
            }

            if (user.getLastActivity() != null) {
                status.put("lastActivity", isoFormatter.format(user.getLastActivity().atOffset(ZoneOffset.UTC).toInstant()));
                long inactiveSeconds = java.time.Duration.between(user.getLastActivity().atOffset(ZoneOffset.UTC).toInstant(), Instant.now()).getSeconds();
                status.put("inactiveSeconds", inactiveSeconds);
            } else {
                status.put("lastActivity", null);
                status.put("inactiveSeconds", null);
            }

            return ResponseEntity.ok(status);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
   
    // ----------------- All Users Status -----------------
    @GetMapping("/all-status")
    public ResponseEntity<?> getAllUsersStatus() {
        try {
            List<User> users = userRepository.findAll();
            Instant nowUtc = Instant.now();

            AtomicInteger markedOffline = new AtomicInteger(0);
            AtomicInteger onlineCount = new AtomicInteger(0);

            List<Map<String, Object>> userStatuses = users.stream().map(user -> {
                Map<String, Object> status = new HashMap<>();
                status.put("userId", user.getId());
                status.put("username", user.getUsername());
                status.put("email", user.getEmail());

                // Send UTC ISO strings
                status.put("lastLogin", user.getLastLogin() != null
                        ? isoFormatter.format(user.getLastLogin().atOffset(ZoneOffset.UTC).toInstant())
                        : null);
                status.put("lastActivity", user.getLastActivity() != null
                        ? isoFormatter.format(user.getLastActivity().atOffset(ZoneOffset.UTC).toInstant())
                        : null);

                boolean isOnline = false;
                if (user.getLastActivity() != null) {
                    long secondsInactive = java.time.Duration.between(user.getLastActivity().atOffset(ZoneOffset.UTC).toInstant(), nowUtc).getSeconds();
                    status.put("inactiveSeconds", secondsInactive);

                    if (secondsInactive <= 30) {
                        isOnline = true;
                        onlineCount.incrementAndGet();
                    } else {
                        if (user.getIsOnline()) {
                            markedOffline.incrementAndGet();
                            user.setOnline(false);
                        }
                    }
                } else {
                    status.put("inactiveSeconds", null);
                }

                status.put("isOnline", isOnline);
                return status;
            }).collect(Collectors.toList());

            // Save users who went offline
            if (markedOffline.get() > 0) {
                userRepository.saveAll(users.stream()
                        .filter(user -> !user.getIsOnline() && user.getLastActivity() != null)
                        .collect(Collectors.toList()));
            }

            return ResponseEntity.ok(userStatuses);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Failed to fetch user statuses: " + e.getMessage()));
        }
    }

    // ... other endpoints (logout, cleanup, stats) remain unchanged
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