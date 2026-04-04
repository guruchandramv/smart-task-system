package com.example.taskmanager.controller;

import com.example.taskmanager.model.User;
import com.example.taskmanager.repository.UserRepository;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.beans.factory.annotation.Autowired;
import java.util.List;
import java.util.stream.Collectors;
import java.util.Optional;

@RestController
@RequestMapping("/api/users")  // Changed from "/api" to "/api/users" for better REST practice
@CrossOrigin(origins = "http://localhost:3000")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    /**
     * Get all users for assignment in tasks (returns only id, username, email)
     * This is what the frontend AdminDashboard expects
     * Endpoint: GET /api/users/assignable
     */
    @GetMapping("/assignable")
    public ResponseEntity<List<UserDTO>> getAssignableUsers() {
        try {
            List<User> users = userRepository.findAll();
            
            List<UserDTO> userDTOs = users.stream()
                .map(user -> new UserDTO(user.getId(), user.getUsername(), user.getEmail()))
                .collect(Collectors.toList());
            
            return ResponseEntity.ok(userDTOs);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Get all users with full details (password removed)
     * Endpoint: GET /api/users/all
     */
    @GetMapping("/all")
    public ResponseEntity<List<User>> getAllUsers() {
        try {
            List<User> users = userRepository.findAll();
            // Remove passwords before sending
            users.forEach(user -> user.setPassword(null));
            return ResponseEntity.ok(users);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Get user by ID
     * Endpoint: GET /api/users/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<User> getUserById(@PathVariable Long id) {
        try {
            Optional<User> userOptional = userRepository.findById(id);
            
            if (userOptional.isPresent()) {
                User user = userOptional.get();
                user.setPassword(null); // Remove password before sending
                return ResponseEntity.ok(user);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Create a new user
     * Endpoint: POST /api/users
     */
    @PostMapping
    public ResponseEntity<?> createUser(@RequestBody User user) {
        try {
            // Check if email already exists
            Optional<User> existingUser = userRepository.findByEmail(user.getEmail());
            if (existingUser.isPresent()) {
                return ResponseEntity.badRequest()
                    .body(new ErrorResponse("Email already exists: " + user.getEmail()));
            }
            
            // Save the user (password should be encoded by AuthController)
            User savedUser = userRepository.save(user);
            savedUser.setPassword(null); // Remove password from response
            
            return ResponseEntity.status(201).body(savedUser);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                .body(new ErrorResponse("Error creating user: " + e.getMessage()));
        }
    }

    /**
     * Update an existing user
     * Endpoint: PUT /api/users/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateUser(@PathVariable Long id, @RequestBody User userDetails) {
        try {
            Optional<User> userOptional = userRepository.findById(id);
            
            if (!userOptional.isPresent()) {
                return ResponseEntity.notFound().build();
            }
            
            User user = userOptional.get();
            
            // Update fields
            if (userDetails.getUsername() != null) {
                user.setUsername(userDetails.getUsername());
            }
            
            if (userDetails.getEmail() != null) {
                // Check if new email is already taken by another user
                Optional<User> existingUser = userRepository.findByEmail(userDetails.getEmail());
                if (existingUser.isPresent() && !existingUser.get().getId().equals(id)) {
                    return ResponseEntity.badRequest()
                        .body(new ErrorResponse("Email already exists: " + userDetails.getEmail()));
                }
                user.setEmail(userDetails.getEmail());
            }
            
            if (userDetails.getRole() != null) {
                user.setRole(userDetails.getRole());
            }
            
            // Don't update password here - use AuthController for password changes
            
            User updatedUser = userRepository.save(user);
            updatedUser.setPassword(null); // Remove password from response
            
            return ResponseEntity.ok(updatedUser);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                .body(new ErrorResponse("Error updating user: " + e.getMessage()));
        }
    }

    /**
     * Delete a user
     * Endpoint: DELETE /api/users/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        try {
            if (!userRepository.existsById(id)) {
                return ResponseEntity.notFound().build();
            }
            
            userRepository.deleteById(id);
            return ResponseEntity.ok(new MessageResponse("User deleted successfully"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                .body(new ErrorResponse("Error deleting user: " + e.getMessage()));
        }
    }

    /**
     * Search users by username or email
     * Endpoint: GET /api/users/search?query=
     */
    @GetMapping("/search")
    public ResponseEntity<List<UserDTO>> searchUsers(@RequestParam String query) {
        try {
            List<User> users = userRepository.findAll();
            
            // Filter users by username or email containing the query (case insensitive)
            List<UserDTO> userDTOs = users.stream()
                .filter(user -> 
                    user.getUsername().toLowerCase().contains(query.toLowerCase()) ||
                    user.getEmail().toLowerCase().contains(query.toLowerCase())
                )
                .map(user -> new UserDTO(user.getId(), user.getUsername(), user.getEmail()))
                .collect(Collectors.toList());
            
            return ResponseEntity.ok(userDTOs);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }

    // ====================== DTO Classes ======================

    /**
     * DTO for transferring user data without sensitive information
     */
    public static class UserDTO {
        private Long id;
        private String username;
        private String email;

        public UserDTO(Long id, String username, String email) {
            this.id = id;
            this.username = username;
            this.email = email;
        }

        // Getters
        public Long getId() { return id; }
        public String getUsername() { return username; }
        public String getEmail() { return email; }
    }

    /**
     * Error response DTO
     */
    public static class ErrorResponse {
        private String error;
        private long timestamp;

        public ErrorResponse(String error) {
            this.error = error;
            this.timestamp = System.currentTimeMillis();
        }

        public String getError() { return error; }
        public long getTimestamp() { return timestamp; }
    }

    /**
     * Message response DTO
     */
    public static class MessageResponse {
        private String message;
        private long timestamp;

        public MessageResponse(String message) {
            this.message = message;
            this.timestamp = System.currentTimeMillis();
        }

        public String getMessage() { return message; }
        public long getTimestamp() { return timestamp; }
    }
}