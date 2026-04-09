package com.example.taskmanager.service;

import com.example.taskmanager.model.Task;
import com.example.taskmanager.repository.TaskRepository;
import com.example.taskmanager.dto.TaskDTO;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class TaskService {
    private final TaskRepository taskRepository;

    public TaskService(TaskRepository taskRepository) {
        this.taskRepository = taskRepository;
    }

    // Return list of TaskDTO instead of Task
    public List<TaskDTO> getTasksByAssignedUserId(Long userId) {
        List<Task> tasks = taskRepository.findByAssignedUserId(userId);
        return tasks.stream().map(TaskDTO::new).collect(Collectors.toList());
    }

    public TaskDTO updateTaskStatus(Long taskId, Task task) {
        Task existingTask = taskRepository.findById(taskId)
            .orElseThrow(() -> new RuntimeException("Task not found"));

        existingTask.setStatus(task.getStatus());
        existingTask.setUpdatedAt(LocalDateTime.now());

        Task updatedTask = taskRepository.save(existingTask);
        return new TaskDTO(updatedTask); // Return DTO
    }

    public List<TaskDTO> getAllTasks() {
        List<Task> tasks = taskRepository.findAll();
        return tasks.stream().map(TaskDTO::new).collect(Collectors.toList());
    }
}