package com.example.taskmanager.service;
import com.example.taskmanager.model.Task;
import com.example.taskmanager.repository.TaskRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
@Service
public class TaskService {
    private final TaskRepository taskRepository;
    public TaskService(TaskRepository taskRepository) {
        this.taskRepository = taskRepository;
    }
    public List<Task> getTasksByAssignedUserId(Long userId) {
        return taskRepository.findByAssignedUserId(userId);  // Using the custom method
    }
     public Task updateTaskStatus(Long taskId, Task task) {
        Task existingTask = taskRepository.findById(taskId).orElseThrow(() -> new RuntimeException("Task not found"));
        existingTask.setStatus(task.getStatus());
        existingTask.setUpdatedAt(LocalDateTime.now()); // Update the timestamp for when the task status was modified
        return taskRepository.save(existingTask); // Save the updated task
    }
}