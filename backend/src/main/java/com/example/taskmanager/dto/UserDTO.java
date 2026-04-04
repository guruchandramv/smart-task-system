package com.example.taskmanager.dto;

public class UserDTO {
    private Long id;
    private String username;
    private String email;
    private String role;
    private boolean hasProfilePicture;
    private String profilePictureType;

    public UserDTO(Long id, String username, String email, String role) {
        this.id = id;
        this.username = username;
        this.email = email;
        this.role = role;
        this.hasProfilePicture = false;
    }

    public UserDTO(Long id, String username, String email, String role, boolean hasProfilePicture, String profilePictureType) {
        this.id = id;
        this.username = username;
        this.email = email;
        this.role = role;
        this.hasProfilePicture = hasProfilePicture;
        this.profilePictureType = profilePictureType;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public boolean isHasProfilePicture() { return hasProfilePicture; }
    public void setHasProfilePicture(boolean hasProfilePicture) { this.hasProfilePicture = hasProfilePicture; }

    public String getProfilePictureType() { return profilePictureType; }
    public void setProfilePictureType(String profilePictureType) { this.profilePictureType = profilePictureType; }
}