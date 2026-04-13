package com.example.taskmanager.repository;

import com.example.taskmanager.model.TaskMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface TaskMessageRepository extends JpaRepository<TaskMessage, Long> {
    @Query("SELECT COALESCE(MAX(m.messageNumber), 0) FROM TaskMessage m WHERE m.task.id = :taskId")
    Integer getMaxMessageNumber(Long taskId);
    List<TaskMessage> findByTaskIdOrderByMessageNumberAsc(Long taskId);
}