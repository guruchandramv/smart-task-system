package com.example.taskmanager.repository;

import com.example.taskmanager.model.Task;
import com.example.taskmanager.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TaskRepository extends JpaRepository<Task, Long> {

    // Find tasks by status
    List<Task> findByStatus(String status);
    List<Task> findByStatusNot(String status);
    
    // Find tasks by assigned user
    List<Task> findByAssignedUser(User assignedUser);

    // Find tasks by assigned user ID
    List<Task> findByAssignedUserId(Long userId);

    // Find tasks by created by
    List<Task> findByCreatedBy(User createdBy);

    // Find unassigned tasks (status = NEW)
    @Query("SELECT t FROM Task t WHERE t.status = 'NEW'")
    List<Task> findAllUnassignedTasks();

     @Query("SELECT t FROM Task t LEFT JOIN FETCH t.assignedUser WHERE t.id = :id")
    Task findByIdWithUser(@Param("id") Long id);

    @Query("SELECT t FROM Task t LEFT JOIN FETCH t.assignedUser")
    List<Task> findAllWithUser();
}