package com.example.taskmanager.dto;

import com.example.taskmanager.model.Task;

public class TaskDTO {
    private Long id;
    private String title;
    private String description;
    private String status;
    private String priority;
    private String deadline;
    private UserDTO assignedUser; // Use your existing UserDTO

    public TaskDTO(Task task) {
        this.id = task.getId();
        this.title = task.getTitle();
        this.description = task.getDescription();
        this.status = task.getStatus();
        this.priority = task.getPriority();
        this.deadline = task.getDeadline() != null ? task.getDeadline().toString() : null;
        this.assignedUser = task.getAssignedUser() != null
                ? new UserDTO(
                    task.getAssignedUser().getId(),
                    task.getAssignedUser().getUsername(),
                    task.getAssignedUser().getEmail(),
                    task.getAssignedUser().getRole()
                )
                : null;
    }

    // Getters and setters...
    public Long getId() { return id; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public String getStatus() { return status; }
    public String getPriority() { return priority; }
    public String getDeadline() { return deadline; }
    public UserDTO getAssignedUser() { return assignedUser; }
}