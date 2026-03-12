package com.example.taskmanager.model;

import javax.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import java.util.List;
import java.time.LocalDateTime;

@Entity
@Table(name = "users", schema = "scott")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "user_seq")
    @SequenceGenerator(
            name = "user_seq",
            sequenceName = "scott.user_seq",
            allocationSize = 1
    )
    private Long id;

    @Column(nullable = false)
    private String username;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    @JsonIgnore
    private String password;

    private String role;

    @Column(name = "last_login")
    private LocalDateTime lastLogin;

    @Column(name = "last_activity")
    private LocalDateTime lastActivity;

    @Column(name = "is_online")
    private Boolean isOnline = false;

    @OneToMany(mappedBy = "assignedUser", fetch = FetchType.LAZY)
    @JsonManagedReference
    private List<Task> tasks;

    @PrePersist
    protected void onCreate() {
        if (lastLogin == null) {
            lastLogin = LocalDateTime.now();
        }
        if (lastActivity == null) {
            lastActivity = LocalDateTime.now();
        }
    }

    public Long getId() { return id; }

    public void setId(Long id) { this.id = id; }

    public String getUsername() { return username; }

    public void setUsername(String username) { this.username = username; }

    public String getEmail() { return email; }

    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }

    public void setPassword(String password) { this.password = password; }

    public String getRole() { return role; }

    public void setRole(String role) { this.role = role; }

    public List<Task> getTasks() { return tasks; }

    public void setTasks(List<Task> tasks) { this.tasks = tasks; }

    public LocalDateTime getLastLogin() { return lastLogin; }

    public void setLastLogin(LocalDateTime lastLogin) { this.lastLogin = lastLogin; }

    public LocalDateTime getLastActivity() { return lastActivity; }

    public void setLastActivity(LocalDateTime lastActivity) { this.lastActivity = lastActivity; }

    public Boolean getIsOnline() { return isOnline; }

    public void setOnline(Boolean online) { isOnline = online; }
}