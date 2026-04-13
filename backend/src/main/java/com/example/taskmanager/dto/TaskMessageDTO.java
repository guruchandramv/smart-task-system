package com.example.taskmanager.dto;

import java.time.LocalDateTime;
import com.example.taskmanager.model.TaskMessage;

public class TaskMessageDTO {

    private Long id;
    private String message;
    private Integer messageNumber;
    private String username;
    private LocalDateTime createdAt;

    public TaskMessageDTO(TaskMessage msg) {
        this.id = msg.getId();
        this.message = msg.getMessage();
        this.messageNumber = msg.getMessageNumber();
        this.username = msg.getUser().getUsername(); // ✅ only what you need
        this.createdAt = msg.getCreatedAt();
    }

    public Long getId() { return id; }
    public String getMessage() { return message; }
    public Integer getMessageNumber() { return messageNumber; }
    public String getUsername() { return username; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}